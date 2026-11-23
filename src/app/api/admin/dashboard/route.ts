import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { awaitingReplyWhere } from "@/lib/queries/awaiting-reply";
import type { AdminDashboard } from "@/lib/schemas/admin";

export const GET = apiHandler(async (request) => {
  await requireAdmin(request);

  const db = getDb();
  const activeFoundItems = isNull(foundItems.deletedAt);

  const [
    [{ foundItemCount }],
    [{ lostReportCount }],
    [{ resolvedCount }],
    [{ awaitingReplyCount }],
  ] = await Promise.all([
    db
      .select({ foundItemCount: count() })
      .from(foundItems)
      .where(activeFoundItems),
    db.select({ lostReportCount: count() }).from(lostReports),
    db
      .select({ resolvedCount: count() })
      .from(foundItems)
      .where(and(activeFoundItems, eq(foundItems.status, "resolved"))),
    // 返信待ちの決め方は GET /api/chats・toLostReportForAdmin と同じ（awaiting-reply.ts）
    db
      .select({ awaitingReplyCount: count() })
      .from(lostReports)
      .where(awaitingReplyWhere),
  ]);

  return Response.json({
    foundItemCount,
    lostReportCount,
    awaitingReplyCount,
    resolvedCount,
  } satisfies AdminDashboard);
});
