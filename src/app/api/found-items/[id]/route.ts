import { and, eq, isNull, notExists } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, foundItemPhotos, foundItems, matches } from "@/db/schema";
import { requireStaff } from "@/lib/api/auth";
import { badRequest, forbidden, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  activeFoundItemById,
  findFoundItemId,
  foundItemWith,
  replaceFoundItemPhotos,
} from "@/lib/queries/found-items";
import {
  type FoundItem,
  FoundItemIdParams,
  PatchFoundItemBody,
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function findActiveFoundItem(id: string) {
  const db = getDb();
  const row = await db.query.foundItems.findFirst({
    where: activeFoundItemById(id),
    with: foundItemWith,
  });
  if (!row) throw notFound("拾得物が見つかりません");
  return row;
}

function assertCanEdit(
  role: string,
  registeredByEmail: string,
  viewerEmail: string,
) {
  if (role !== "admin" && registeredByEmail !== viewerEmail) {
    throw forbidden("自分が登録した拾得物のみ操作できます");
  }
}

async function serializeFoundItem(
  row: Awaited<ReturnType<typeof findActiveFoundItem>>,
  staff: Parameters<typeof toFoundItem>[1],
) {
  const photoUrlOf = await signPhotoUrls(photoPathsOf([row], "all"));
  return toFoundItem(row, staff, photoUrlOf) satisfies FoundItem;
}

// GET /api/found-items/{id}
export const GET = apiHandler(async (request, ctx: RouteContext) => {
  const staff = await requireStaff(request);
  const { id } = parseParams(await ctx.params, FoundItemIdParams);

  const row = await findActiveFoundItem(id);
  return Response.json(await serializeFoundItem(row, staff));
});

// PATCH /api/found-items/{id}
export const PATCH = apiHandler(async (request, ctx: RouteContext) => {
  const staff = await requireStaff(request);
  const { id } = parseParams(await ctx.params, FoundItemIdParams);
  const body = await parseBody(request, PatchFoundItemBody);

  const existing = await findActiveFoundItem(id);
  assertCanEdit(staff.role, existing.registeredByEmail, staff.email);

  const db = getDb();
  if (body.categoryId !== undefined) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, body.categoryId),
      columns: { id: true },
    });
    if (!category) {
      throw badRequest("指定されたカテゴリが存在しません");
    }
  }

  const updateValues: Partial<typeof foundItems.$inferInsert> = {};
  if (body.categoryId !== undefined) updateValues.categoryId = body.categoryId;
  if (body.color !== undefined) updateValues.color = body.color;
  if (body.brand !== undefined) updateValues.brand = body.brand;
  if (body.foundPlace !== undefined) updateValues.foundPlace = body.foundPlace;
  if (body.foundAt !== undefined) updateValues.foundAt = new Date(body.foundAt);
  if (body.isValuable !== undefined) updateValues.isValuable = body.isValuable;
  if (body.memo !== undefined) updateValues.memo = body.memo;

  await db.transaction(async (tx) => {
    if (Object.keys(updateValues).length > 0) {
      await tx
        .update(foundItems)
        .set(updateValues)
        .where(activeFoundItemById(id));
    }

    // keepPhotoIds と photos のどちらも送らなければ、写真は変えない
    if (body.keepPhotoIds !== undefined || body.photos !== undefined) {
      // TODO(#64): 返ってくる外した写真のファイルを、コミットしたあとに Storage から消す
      await replaceFoundItemPhotos(
        tx,
        id,
        body.keepPhotoIds ?? [],
        body.photos ?? [],
      );
    }
  });

  const updated = await findActiveFoundItem(id);
  return Response.json(await serializeFoundItem(updated, staff));
});

// DELETE /api/found-items/{id}
export const DELETE = apiHandler(async (request, ctx: RouteContext) => {
  const staff = await requireStaff(request);
  const { id } = parseParams(await ctx.params, FoundItemIdParams);

  // 先に読むのは、権限（自分が登録したものか）を確かめるため。登録した人は変わらないので、読んだ値で決めてよい
  const existing = await findActiveFoundItem(id);
  assertCanEdit(staff.role, existing.registeredByEmail, staff.email);

  // 受理（received）のときだけ削除する。状態は読んだ値ではなく UPDATE の WHERE で確かめる（#49）。
  // 読んでから UPDATE するまでに紐づけ・受け渡し・ステータスの変更が通ると、拾得物は received でなくなり、
  // この UPDATE はそのコミットを待ってから WHERE を見直すので 0 行になる。
  //
  // lockActiveMatch（申請 → 拾得物の順のロック）は使わない。received の拾得物には有効な紐づけがなく
  // （紐づけは拾得物を matching にする）、この API は申請の行に触らず、拾得物の 1 行を 1 文で更新する
  // だけなので、ほかの API とロックの順が逆になることはない（docs/api-guide.md の手順 3 の例外の bulk-status と同じ）。
  //
  // bulk-status と同じく、状態の列と食い違って、受理なのに有効な紐づけが残っているものも削除しない
  // （削除すると、申請が削除した拾得物に紐づいたまま残る）。NOT EXISTS は文の始まりの時点で見るが、
  // 同時に入る紐づけは拾得物を matching にするので、そちらは status の見直しで 0 行になる
  const db = getDb();
  const [row] = await db
    .update(foundItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        activeFoundItemById(id),
        eq(foundItems.status, "received"),
        notExists(
          db
            .select({ id: matches.id })
            .from(matches)
            .where(
              and(
                eq(matches.foundItemId, foundItems.id),
                isNull(matches.releasedAt),
              ),
            ),
        ),
      ),
    )
    .returning({ id: foundItems.id });
  if (!row) {
    throw await notFoundOrConflict(
      findFoundItemId(db, id),
      "保管中（received）で、申請と紐づいていない拾得物だけ削除できます",
      "拾得物が見つかりません",
    );
  }

  return new Response(null, { status: 204 });
});
