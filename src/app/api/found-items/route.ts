import { count, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems } from "@/db/schema";
import { requireStaff } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/parse";
import { foundItemFilters, foundItemListWith } from "@/lib/queries/found-items";
import { toOffset } from "@/lib/schemas/common";
import {
  FoundItemListQuery,
  type FoundItemList,
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

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

  // 4. 共通の形にして返す（写真の署名付き URL はまとめて作る）
  const photoUrlOf = await signPhotoUrls(photoPathsOf(rows));
  return Response.json({
    items: rows.map((row) => toFoundItem(row, staff, photoUrlOf)),
    total,
  } satisfies FoundItemList);
});
