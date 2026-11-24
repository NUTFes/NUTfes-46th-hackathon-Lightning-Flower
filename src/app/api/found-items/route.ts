import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, foundItemPhotos, foundItems } from "@/db/schema";
import { requireStaff } from "@/lib/api/auth";
import { badRequest, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseQuery } from "@/lib/api/parse";
import {
  foundItemFilters,
  foundItemListWith,
  isPhotoPathUsed,
} from "@/lib/queries/found-items";
import { toOffset } from "@/lib/schemas/common";
import {
  FoundItemCreateBody,
  FoundItemListQuery,
  type FoundItemList,
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { findMissingPhotoFiles, signPhotoUrls } from "@/lib/storage/photos";

const PHOTO_OPTIONAL_CATEGORY = "証明書・カード・定期券類";

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; cause?: { code?: unknown } };
  return err.code === "23505" || err.cause?.code === "23505";
}

// 拾得物の一覧・検索（member / admin）。画面：M01・A02
// API を書くときの見本（docs/api-guide.md）
export const GET = apiHandler(async (request) => {
  // 1. 権限を確かめる
  const staff = await requireStaff(request);

  // 2. 入力を確かめる（合わなければ 400）
  const query = parseQuery(request, FoundItemListQuery);

  // 3. DB から取る（一覧と件数を同じ条件で）
  const db = getDb();
  const where = foundItemFilters(query, staff);
  const [rows, [{ total }]] = await Promise.all([
    db.query.foundItems.findMany({
      where,
      with: foundItemListWith,
      orderBy: [desc(foundItems.foundAt), desc(foundItems.number)],
      limit: query.limit,
      offset: toOffset(query),
    }),
    db.select({ total: count() }).from(foundItems).where(where),
  ]);

  // 4. 共通の形にして返す（写真の署名付き URL はまとめて作る。一覧ではサムネイルだけ）
  const photoUrlOf = await signPhotoUrls(photoPathsOf(rows, "thumb"));
  return Response.json({
    items: rows.map((row) => toFoundItem(row, staff, photoUrlOf)),
    total,
  } satisfies FoundItemList);
});

// 拾得物の登録（member / admin）。画面：M02 → M03
export const POST = apiHandler(async (request) => {
  // 1. 権限を確かめる
  const staff = await requireStaff(request);

  // 2. 入力を確かめる（合わなければ 400）
  const body = await parseBody(request, FoundItemCreateBody);

  // 写真のファイルが Storage にあるか（トランザクションの外で、Storage に問い合わせる）。
  // 使われていない写真をまとめて消したあとに、画面に残っていた古いパスで登録させない
  const paths = body.photos.flatMap((p) => [p.path, p.thumbPath]);
  if ((await findMissingPhotoFiles(paths)).length > 0) {
    throw badRequest(
      "写真のファイルが見つかりません。写真を選び直してから登録してください",
    );
  }

  // 3. カテゴリ確認・写真必須チェック・登録を 1 トランザクションで実行
  const db = getDb();
  const foundAt = body.foundAt ? new Date(body.foundAt) : new Date();

  const createdRow = await db.transaction(async (tx) => {
    const [category] = await tx
      .select()
      .from(categories)
      .where(eq(categories.id, body.categoryId));

    if (!category) {
      throw notFound("指定されたカテゴリが見つかりません");
    }

    if (category.name !== PHOTO_OPTIONAL_CATEGORY && body.photos.length === 0) {
      throw badRequest(
        `「${PHOTO_OPTIONAL_CATEGORY}」以外のカテゴリでは photos を 1 件以上指定してください`,
      );
    }

    const isValuable = body.isValuable ?? category.isValuableDefault;

    if (await isPhotoPathUsed(tx, paths)) {
      throw badRequest("すでに使用されている写真パスは指定できません");
    }

    try {
      const [inserted] = await tx
        .insert(foundItems)
        .values({
          categoryId: category.id,
          color: body.color,
          brand: body.brand ?? null,
          foundPlace: body.foundPlace,
          foundAt,
          isValuable,
          memo: body.memo ?? null,
          status: "received",
          registeredByEmail: staff.email,
        })
        .returning();

      const insertedPhotos =
        body.photos.length > 0
          ? await tx
              .insert(foundItemPhotos)
              .values(
                body.photos.map((photo, index) => ({
                  foundItemId: inserted.id,
                  storagePath: photo.path,
                  thumbPath: photo.thumbPath,
                  sortOrder: index,
                })),
              )
              .returning({
                id: foundItemPhotos.id,
                storagePath: foundItemPhotos.storagePath,
                thumbPath: foundItemPhotos.thumbPath,
              })
          : [];

      return {
        ...inserted,
        category: { id: category.id, name: category.name },
        photos: insertedPhotos,
        matches: [],
        handovers: [],
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw badRequest("すでに使用されている写真パスは指定できません");
      }
      throw error;
    }
  });

  // 4. 共通の形にして 201 で返す
  const photoUrlOf = await signPhotoUrls(photoPathsOf([createdRow], "all"));
  return Response.json(toFoundItem(createdRow, staff, photoUrlOf), {
    status: 201,
  });
});
