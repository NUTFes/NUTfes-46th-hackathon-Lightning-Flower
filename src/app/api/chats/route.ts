import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, lostReports, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/parse";
import {
  ChatThreadListQuery,
  type ChatThreadList,
} from "@/lib/schemas/message";
import { toOffset } from "@/lib/schemas/common";
import { toChatThread } from "@/lib/serializers/message";

// チャットのスレッドの一覧（admin）。画面：A01・A06
// メッセージが 1 通以上ある申請を、最新のメッセージの新しい順に返す（?page=1&limit=20 で区切る）。
// 返信待ち＝最新のメッセージが guest のもの（toLostReportForAdmin の awaitingReply と同じ）
export const GET = apiHandler(async (request) => {
  await requireAdmin(request);
  const query = parseQuery(request, ChatThreadListQuery);

  const db = getDb();
  // 申請ごとの最新のメッセージ。同じ時刻のときも 1 通に決まるように id でも並べる
  // （lostReportForAdminWith の messages と同じ並べ方）
  const latest = db
    .selectDistinctOn([messages.lostReportId], {
      lostReportId: messages.lostReportId,
      senderRole: messages.senderRole,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .orderBy(messages.lostReportId, desc(messages.createdAt), desc(messages.id))
    .as("latest");

  const where =
    query.awaitingReply === undefined
      ? undefined
      : eq(latest.senderRole, query.awaitingReply ? "guest" : "admin");

  // 一覧と件数を同じ条件で
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        lostReportId: lostReports.id,
        number: lostReports.number,
        category: { id: categories.id, name: categories.name },
        color: lostReports.color,
        status: lostReports.status,
        lastMessageAt: latest.createdAt,
        lastSenderRole: latest.senderRole,
      })
      .from(latest)
      .innerJoin(lostReports, eq(lostReports.id, latest.lostReportId))
      .innerJoin(categories, eq(categories.id, lostReports.categoryId))
      .where(where)
      .orderBy(desc(latest.createdAt), desc(lostReports.number))
      .limit(query.limit)
      .offset(toOffset(query)),
    db.select({ total: count() }).from(latest).where(where),
  ]);

  return Response.json({
    items: rows.map(toChatThread),
    total,
  } satisfies ChatThreadList);
});
