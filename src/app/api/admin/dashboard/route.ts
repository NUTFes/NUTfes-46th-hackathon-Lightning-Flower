import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import type { AdminDashboard } from "@/lib/schemas/admin";

export const GET = apiHandler(async (request) => {
  await requireAdmin(request);

  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const activeFoundItems = isNull(foundItems.deletedAt);

  // 各 lost_report_id の最新メッセージの sender_role を取得（同刻の場合は id でタイブレーク）
  const latestMessages = db
    .selectDistinctOn([messages.lostReportId], {
      lostReportId: messages.lostReportId,
      senderRole: messages.senderRole,
    })
    .from(messages)
    .orderBy(
      messages.lostReportId,
      sql`${messages.createdAt} DESC`,
      sql`${messages.id} DESC`,
    )
    .as("latest_messages");

  const [
    [{ foundItemCount }],
    [{ lostReportCount }],
    [{ resolvedCount }],
    [{ foundItemsLastHour }],
    [{ lostReportsLastHour }],
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
    db
      .select({ foundItemsLastHour: count() })
      .from(foundItems)
      .where(and(activeFoundItems, gte(foundItems.createdAt, oneHourAgo))),
    db
      .select({ lostReportsLastHour: count() })
      .from(lostReports)
      .where(gte(lostReports.createdAt, oneHourAgo)),
    db
      .select({ awaitingReplyCount: count() })
      .from(latestMessages)
      .where(eq(latestMessages.senderRole, "guest")),
  ]);

  return Response.json({
    foundItemCount,
    lostReportCount,
    awaitingReplyCount,
    resolvedCount,
    foundItemsLastHour,
    lostReportsLastHour,
  } satisfies AdminDashboard);
});
