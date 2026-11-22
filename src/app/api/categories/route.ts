import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { apiHandler } from "@/lib/api/handler";
import type { CategoryList } from "@/lib/schemas/category";

// カテゴリ 12 種と貴重品の初期値（だれでも読める）
export const GET = apiHandler(async () => {
  const rows = await getDb()
    .select({
      id: categories.id,
      name: categories.name,
      isValuableDefault: categories.isValuableDefault,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder));

  // カテゴリはマイグレーションでしか変わらないので、ブラウザと CDN に 5 分キャッシュさせる
  return Response.json({ items: rows } satisfies CategoryList, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
});
