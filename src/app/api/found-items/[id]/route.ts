import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, foundItemPhotos, foundItems } from "@/db/schema";
import { requireStaff } from "@/lib/api/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import { foundItemWith } from "@/lib/queries/found-items";
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
    where: and(eq(foundItems.id, id), isNull(foundItems.deletedAt)),
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
        .where(and(eq(foundItems.id, id), isNull(foundItems.deletedAt)));
    }

    if (body.photos !== undefined) {
      await tx
        .delete(foundItemPhotos)
        .where(eq(foundItemPhotos.foundItemId, id));

      if (body.photos.length > 0) {
        await tx.insert(foundItemPhotos).values(
          body.photos.map((photo, index) => ({
            foundItemId: id,
            storagePath: photo.storagePath,
            thumbPath: photo.thumbPath,
            sortOrder: index,
          })),
        );
      }
    }
  });

  const updated = await findActiveFoundItem(id);
  return Response.json(await serializeFoundItem(updated, staff));
});

// DELETE /api/found-items/{id}
export const DELETE = apiHandler(async (request, ctx: RouteContext) => {
  const staff = await requireStaff(request);
  const { id } = parseParams(await ctx.params, FoundItemIdParams);

  const existing = await findActiveFoundItem(id);
  assertCanEdit(staff.role, existing.registeredByEmail, staff.email);

  if (existing.status !== "received") {
    throw conflict("保管中（received）以外の拾得物は削除できません");
  }

  const db = getDb();
  await db
    .update(foundItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(foundItems.id, id), isNull(foundItems.deletedAt)));

  return new Response(null, { status: 204 });
});
