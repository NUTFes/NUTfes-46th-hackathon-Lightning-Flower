import { and, desc, eq, inArray, notInArray, type SQL } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  ENDED_LOST_STATUSES,
  type LOST_STATUSES,
  type SENDER_ROLES,
} from "@/db/enums";
import { lostReports, messages } from "@/db/schema";

// 返信待ち＝申請の最新のメッセージが guest のもので、申請が終わっていない（ENDED_LOST_STATUSES でない）もの。
// 終わった申請には guest がもう送れないので、admin が返信しなくても返信待ちから外す。
// ダッシュボードの件数・GET /api/chats・toLostReportForAdmin の awaitingReply は、どれもこの定義で決める
// 「最新」は created_at の新しい順、同じ時刻なら id の大きい順（lostReportForAdminWith の messages と同じ）

// 取った行で決める（serializer で使う）。メッセージがなければ返信待ちではない
export function isAwaitingReply(
  lastSenderRole: (typeof SENDER_ROLES)[number] | undefined,
  status: (typeof LOST_STATUSES)[number],
): boolean {
  return (
    lastSenderRole === "guest" &&
    !(ENDED_LOST_STATUSES as readonly string[]).includes(status)
  );
}

// SQL の条件。lost_reports を from か join に入れたクエリの where に使う。db.query.lostReports.findMany の where にも渡せる
// （not() で「返信待ちでない」にもできる。メッセージがない申請は、返信待ちでない側に入る）
// 生の sql でサブクエリを書くと、findMany が中の列を全部 lost_reports の別名に書き換えて壊れるので、
// サブクエリはクエリビルダーで作り、inArray に渡す

// 申請ごとの最新のメッセージ（DB につながずに組み立てるだけなので QueryBuilder を使う）
const qb = new QueryBuilder();
const latestMessages = qb
  .selectDistinctOn([messages.lostReportId], {
    lostReportId: messages.lostReportId,
    senderRole: messages.senderRole,
  })
  .from(messages)
  .orderBy(messages.lostReportId, desc(messages.createdAt), desc(messages.id))
  .as("latest_messages");

// 最新のメッセージが guest の申請の id
const lastFromGuest = qb
  .select({ id: latestMessages.lostReportId })
  .from(latestMessages)
  .where(eq(latestMessages.senderRole, "guest"));

export const awaitingReplyWhere = and(
  notInArray(lostReports.status, [...ENDED_LOST_STATUSES]),
  inArray(lostReports.id, lastFromGuest),
) as SQL;
