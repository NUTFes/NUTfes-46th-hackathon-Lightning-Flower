import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
} from "drizzle-orm";
import type { Db, Tx, WithOf } from "@/db";
import { containsPattern } from "@/db/like";
import {
  foundItemPhotos,
  foundItems,
  handovers,
  lostReports,
  matches,
} from "@/db/schema";
import { badRequest, conflict, notFound } from "@/lib/api/errors";
import type { Staff } from "@/lib/auth/staff";
import type {
  FoundItemListQuery,
  FoundItemPhotoInput,
} from "@/lib/schemas/found-item";

// 拾得物を FoundItem にするために、一緒に取る関連の行（db.query.foundItems の with に渡す）。
// 取った行の型が src/lib/serializers/found-item.ts の FoundItemRow になる（with を変えると、型が一緒に変わる）
export const foundItemWith = {
  category: { columns: { id: true, name: true } },
  photos: {
    columns: { id: true, storagePath: true, thumbPath: true },
    orderBy: [asc(foundItemPhotos.sortOrder)],
  },
  // 有効な紐づけだけ
  matches: {
    columns: {},
    where: isNull(matches.releasedAt),
    with: { lostReport: { columns: { id: true, number: true } } },
  },
  handovers: {
    columns: { handedAt: true, receiverName: true },
    orderBy: [desc(handovers.handedAt)],
    limit: 1,
  },
} satisfies WithOf<"foundItems">;

// 一覧では写真を 1 枚目だけ取る
export const foundItemListWith = {
  ...foundItemWith,
  photos: { ...foundItemWith.photos, limit: 1 },
} satisfies WithOf<"foundItems">;

// GET /api/found-items の絞り込みの条件（論理削除したものは常に除く）
export function foundItemFilters(query: FoundItemListQuery, viewer: Staff) {
  return and(
    isNull(foundItems.deletedAt),
    query.q
      ? or(
          ilike(foundItems.brand, containsPattern(query.q)),
          ilike(foundItems.memo, containsPattern(query.q)),
          ilike(foundItems.foundPlace, containsPattern(query.q)),
        )
      : undefined,
    query.status ? inArray(foundItems.status, query.status) : undefined,
    query.categoryId != null
      ? eq(foundItems.categoryId, query.categoryId)
      : undefined,
    query.color ? inArray(foundItems.color, query.color) : undefined,
    query.place
      ? ilike(foundItems.foundPlace, containsPattern(query.place))
      : undefined,
    query.foundFrom
      ? gte(foundItems.foundAt, new Date(query.foundFrom))
      : undefined,
    query.foundTo
      ? lte(foundItems.foundAt, new Date(query.foundTo))
      : undefined,
    query.mine ? eq(foundItems.registeredByEmail, viewer.email) : undefined,
  );
}

// ID の拾得物（論理削除したものは、ないものとする）。1 件を取る API は、どれもこの条件で取る
// （GET・PATCH・DELETE /api/found-items/{id} と、状態を変える API の 404 の判定をそろえるため）
export function activeFoundItemById(id: string) {
  return and(eq(foundItems.id, id), isNull(foundItems.deletedAt));
}

// 拾得物があるか（論理削除したものは、ないものとする）。状態を変える API で、
// 更新できなかったときに 404 と 409 を分けるのに使う
export function findFoundItemId(db: Db | Tx, id: string) {
  return db.query.foundItems.findFirst({
    where: activeFoundItemById(id),
    columns: { id: true },
  });
}

// 更新したあとの拾得物を、FoundItem にする形で取る（状態を変える API が返すのに使う）
export function findFoundItem(db: Db | Tx, id: string) {
  return db.query.foundItems.findFirst({
    where: activeFoundItemById(id),
    with: foundItemWith,
  });
}

// 拾得物から始める、状態を変える API の最初の手順（docs/api-guide.md の「状態を変える API」の 3）。
// 有効な紐づけがあれば、その申請の行を先にロックし（申請 → 拾得物の順）、紐づけがまだ有効かを確かめ直して、
// 申請の ID を返す。最初から紐づけがなければ null を返し、ロックを待つ間に紐づけが変わっていたら 409 にする。
//
// null のとき、呼ぶ側は拾得物の UPDATE の WHERE に「受理（received）」を入れる。紐づけは拾得物を
// received → matching に UPDATE するので、このあとで紐づけが入っても、拾得物の UPDATE が 0 行になって 409 になる
export async function lockActiveMatch(
  tx: Tx,
  foundItemId: string,
): Promise<string | null> {
  const match = await findActiveMatch(tx, foundItemId);
  if (!match) return null;

  await tx
    .select({ id: lostReports.id })
    .from(lostReports)
    .where(eq(lostReports.id, match.lostReportId))
    .for("update");

  // ロックを待つ間に解除されていたり、別の申請と紐づき直していたりしたら、やり直してもらう。
  // 解除のあとで null を返すと、受け渡しが「申請の人への受け渡し」のつもりで押されたのに、
  // 本人確認で違った人への直接返却として通ってしまう
  const current = await findActiveMatch(tx, foundItemId);
  if (!current || current.lostReportId !== match.lostReportId) {
    throw conflict("紐づけが変わりました。画面を読み込み直してください");
  }
  return current.lostReportId;
}

function findActiveMatch(tx: Tx, foundItemId: string) {
  return tx.query.matches.findFirst({
    where: and(
      eq(matches.foundItemId, foundItemId),
      isNull(matches.releasedAt),
    ),
    columns: { lostReportId: true },
  });
}

// 写真のパスを、ほかの拾得物（論理削除したものも含む）がもう使っているか。
// 登録（POST）と写真の差し替え（PATCH）で使い、ほかの拾得物の写真を自分の写真として出させない。
// PATCH では、差し替える前の自分の写真（exceptFoundItemId）は数えない
export async function isPhotoPathUsed(
  db: Db | Tx,
  paths: string[],
  exceptFoundItemId?: string,
): Promise<boolean> {
  if (paths.length === 0) return false;
  const [used] = await db
    .select({ id: foundItemPhotos.id })
    .from(foundItemPhotos)
    .where(
      and(
        exceptFoundItemId === undefined
          ? undefined
          : ne(foundItemPhotos.foundItemId, exceptFoundItemId),
        or(
          inArray(foundItemPhotos.storagePath, paths),
          inArray(foundItemPhotos.thumbPath, paths),
        ),
      ),
    )
    .limit(1);
  return used !== undefined;
}

// PATCH /api/found-items/{id} の写真の変更。写真を keepPhotoIds の順に並べ、そのあとに新しい photos を続ける。keepPhotoIds にない写真の行は消す。
// keepPhotoIds を送らずに photos だけを送ったときは、今の写真をすべて外す（丸ごと置き換え）。
// 外した写真のパスを返す（PATCH がコミットのあとで Storage から消す）。消したあとも、どれかの行（残す写真・付け直した写真・
// ほかの拾得物の写真）が使っているパスの写真は除く。ただし、同時に走るほかのトランザクションのまだコミットしていない行は
// 見えないので、ファイルを消す側でも、コミットしたあとでどの行も使っていないことを確かめ直す
//
// 拾得物の行を先にロックし、同じ拾得物の写真を同時に変える PATCH を順に通す
// （読んだ写真の ID が、確かめてから消す・並べ替えるまでに変わらないように）。
// 申請の行には触らないので、申請 → 拾得物のロックの順（docs/api-guide.md）とは食い違わない
export async function replaceFoundItemPhotos(
  tx: Tx,
  foundItemId: string,
  keepPhotoIds: string[],
  photos: FoundItemPhotoInput[],
): Promise<{ path: string; thumbPath: string }[]> {
  const [locked] = await tx
    .select({ id: foundItems.id })
    .from(foundItems)
    .where(activeFoundItemById(foundItemId))
    .for("update");
  if (!locked) throw notFound("拾得物が見つかりません");

  const current = await tx
    .select({
      id: foundItemPhotos.id,
      storagePath: foundItemPhotos.storagePath,
      thumbPath: foundItemPhotos.thumbPath,
      sortOrder: foundItemPhotos.sortOrder,
    })
    .from(foundItemPhotos)
    .where(eq(foundItemPhotos.foundItemId, foundItemId));

  // ほかの拾得物の写真の ID・存在しない ID は、どちらもこの拾得物の写真にないので 400
  const currentById = new Map(current.map((photo) => [photo.id, photo]));
  if (keepPhotoIds.some((photoId) => !currentById.has(photoId))) {
    throw badRequest(
      "この拾得物にない写真は残せません。画面を読み込み直してください",
    );
  }

  // 新しい写真のパスは、ほかの拾得物の写真とも、残す写真とも重ねない
  const keepIds = new Set(keepPhotoIds);
  const keptPaths = new Set(
    current
      .filter((photo) => keepIds.has(photo.id))
      .flatMap((photo) => [photo.storagePath, photo.thumbPath]),
  );
  const newPaths = photos.flatMap((p) => [p.path, p.thumbPath]);
  if (
    newPaths.some((path) => keptPaths.has(path)) ||
    (await isPhotoPathUsed(tx, newPaths, foundItemId))
  ) {
    throw badRequest("すでに使用されている写真パスは指定できません");
  }

  const removed = current.filter((photo) => !keepIds.has(photo.id));
  if (removed.length > 0) {
    await tx.delete(foundItemPhotos).where(
      inArray(
        foundItemPhotos.id,
        removed.map((photo) => photo.id),
      ),
    );
  }
  // 並びが変わった写真だけを書き直す
  for (const [index, photoId] of keepPhotoIds.entries()) {
    if (currentById.get(photoId)?.sortOrder === index) continue;
    await tx
      .update(foundItemPhotos)
      .set({ sortOrder: index })
      .where(eq(foundItemPhotos.id, photoId));
  }
  if (photos.length > 0) {
    await tx.insert(foundItemPhotos).values(
      photos.map((photo, index) => ({
        foundItemId,
        storagePath: photo.path,
        thumbPath: photo.thumbPath,
        sortOrder: keepPhotoIds.length + index,
      })),
    );
  }

  // 外した写真のうち、まだどれかの行が使っているパスのものは返さない
  // （新しい photos で付け直したとき・残す写真やほかの拾得物の写真と同じパスを指していたとき）
  const removedPaths = removed.flatMap((photo) => [
    photo.storagePath,
    photo.thumbPath,
  ]);
  if (removedPaths.length === 0) return [];
  const stillUsed = await tx
    .select({
      storagePath: foundItemPhotos.storagePath,
      thumbPath: foundItemPhotos.thumbPath,
    })
    .from(foundItemPhotos)
    .where(
      or(
        inArray(foundItemPhotos.storagePath, removedPaths),
        inArray(foundItemPhotos.thumbPath, removedPaths),
      ),
    );
  const usedPaths = new Set(
    stillUsed.flatMap((row) => [row.storagePath, row.thumbPath]),
  );
  return removed
    .filter(
      (photo) =>
        !usedPaths.has(photo.storagePath) && !usedPaths.has(photo.thumbPath),
    )
    .map((photo) => ({ path: photo.storagePath, thumbPath: photo.thumbPath }));
}
