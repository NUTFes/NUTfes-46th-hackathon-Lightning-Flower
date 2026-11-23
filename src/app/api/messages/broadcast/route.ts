import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { lostReports, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/parse";
import {
  MessageBroadcast,
  type MessageBroadcastResult,
} from "@/lib/schemas/message";

// 一斉送信（admin）。画面：A07（期間終了のお知らせ）
// 宛先の申請それぞれに、admin のメッセージを 1 通ずつ入れる（申請ごとに 1 通なので、
// 1 つの文で入れても「最新」は決まる）。ない申請の ID は飛ばし、入れた数を sent で返す。
// 終わった申請も宛先にできる（admin の個別の送信と同じ）
export const POST = apiHandler(async (request) => {
  const admin = await requireAdmin(request);
  const input = await parseBody(request, MessageBroadcast);

  const db = getDb();
  const inserted = await db
    .insert(messages)
    .select(
      db
        .select({
          // insert … select は列の順に入るので、messages の列の順に並べる
          id: sql`gen_random_uuid()`.as("id"),
          lostReportId: lostReports.id,
          senderRole: sql`'admin'::sender_role`.as("sender_role"),
          senderEmail: sql`${admin.email}`.as("sender_email"),
          body: sql`${input.body}`.as("body"),
          // 個別の送信と同じく、トランザクションの開始時刻ではなく入れるときの時刻にする
          createdAt: sql`clock_timestamp()`.as("created_at"),
        })
        .from(lostReports)
        .where(
          input.status
            ? eq(lostReports.status, input.status)
            : inArray(lostReports.id, input.lostReportIds ?? []),
        ),
    )
    .returning({ id: messages.id });

  return Response.json({
    sent: inserted.length,
  } satisfies MessageBroadcastResult);
});
