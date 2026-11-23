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
import { conflict } from "@/lib/api/errors";
import type { Staff } from "@/lib/auth/staff";
import type { FoundItemListQuery } from "@/lib/schemas/found-item";

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
