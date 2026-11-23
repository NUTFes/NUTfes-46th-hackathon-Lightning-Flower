import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lostReports } from "@/db/schema";
import { requireGuest } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/parse";
import { lostReportWith } from "@/lib/queries/lost-reports";
import { toOffset } from "@/lib/schemas/common";
import {
  type LostReportList,
  MyLostReportListQuery,
} from "@/lib/schemas/lost-report";
import { toLostReport } from "@/lib/serializers/lost-report";

// 自分の遺失物申請一覧（guest）。画面：G02
export const GET = apiHandler(async (request) => {
  // 1. 権限を確かめる（guest のみ）
  const guest = await requireGuest(request);

  // 2. 入力を確かめる（?page=1&limit=20）
  const query = parseQuery(request, MyLostReportListQuery);

  // 3. DB から取る（受付日時の新しい順。一覧と件数を同じ条件で）
  const db = getDb();
  const where = eq(lostReports.guestId, guest.id);
  const [rows, [{ total }]] = await Promise.all([
    db.query.lostReports.findMany({
      where,
      with: lostReportWith,
      orderBy: [desc(lostReports.createdAt), desc(lostReports.number)],
      limit: query.limit,
      offset: toOffset(query),
    }),
    db.select({ total: count() }).from(lostReports).where(where),
  ]);

  // 4. 共通の形にして返す（guest には紐づいた拾得物の中身を返さない）
  return Response.json({
    items: rows.map((row) => toLostReport(row)),
    total,
  } satisfies LostReportList);
});
