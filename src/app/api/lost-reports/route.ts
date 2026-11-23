import { count, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { lostReports } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/parse";
import {
  lostReportFilters,
  lostReportForAdminWith,
} from "@/lib/queries/lost-reports";
import { toOffset } from "@/lib/schemas/common";
import {
  type LostReportForAdminList,
  LostReportListQuery,
} from "@/lib/schemas/lost-report";
import { toLostReportForAdmin } from "@/lib/serializers/lost-report";

// 遺失物申請の一覧・検索（admin）。画面：A04
export const GET = apiHandler(async (request) => {
  // 1. 権限を確かめる（admin のみ）
  await requireAdmin(request);

  // 2. 入力を確かめる（合わなければ 400）
  const query = parseQuery(request, LostReportListQuery);

  // 3. DB から取る（一覧と件数を同じ条件で、受付日時の新しい順）
  const db = getDb();
  const where = lostReportFilters(query);
  const [rows, [{ total }]] = await Promise.all([
    db.query.lostReports.findMany({
      where,
      with: lostReportForAdminWith,
      orderBy: [desc(lostReports.createdAt), desc(lostReports.number)],
      limit: query.limit,
      offset: toOffset(query),
    }),
    db.select({ total: count() }).from(lostReports).where(where),
  ]);

  // 4. 共通の形にして返す
  return Response.json({
    items: rows.map((row) => toLostReportForAdmin(row)),
    total,
  } satisfies LostReportForAdminList);
});
