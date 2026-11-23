import { and, desc, eq, ilike, inArray, isNull, not, or } from "drizzle-orm";
import type { Db, Tx, WithOf } from "@/db";
import { containsPattern } from "@/db/like";
import { lostReports, matches, messages } from "@/db/schema";
import { awaitingReplyWhere } from "@/lib/queries/awaiting-reply";
import type { LostReportListQuery } from "@/lib/schemas/lost-report";

// 遺失物申請を LostReport / LostReportForAdmin にするために、一緒に取る関連の行
// （db.query.lostReports の with に渡す）。取った行の型が src/lib/serializers/lost-report.ts の
// LostReportRow / LostReportForAdminRow になる（with を変えると、型が一緒に変わる）

// guest にも返す形
export const lostReportWith = {
  category: { columns: { id: true, name: true } },
} satisfies WithOf<"lostReports">;

// admin に返す形（guest の情報・有効な紐づけ・最新のメッセージを足す）
export const lostReportForAdminWith = {
  ...lostReportWith,
  guest: { columns: { email: true, displayName: true } },
  matches: {
    columns: {},
    where: isNull(matches.releasedAt),
    with: { foundItem: { columns: { id: true, number: true } } },
  },
  messages: {
    columns: { senderRole: true },
    // 同じ時刻のときも、GET /api/chats と同じ 1 通を選ぶように id でも並べる
    orderBy: [desc(messages.createdAt), desc(messages.id)],
    limit: 1,
  },
} satisfies WithOf<"lostReports">;

// 申請があるか（状態を変える API で、更新できなかったときに 404 と 409 を分けるのに使う）
export function findLostReportId(db: Db | Tx, id: string) {
  return db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
    columns: { id: true },
  });
}

// admin に返す形の行（toLostReportForAdmin に渡す）。状態を変える API が、更新したあとの申請を返すのに使う
export function findLostReportForAdmin(db: Db | Tx, id: string) {
  return db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
    with: lostReportForAdminWith,
  });
}

// guest 本人の申請があるか（guest の状態を変える API で、404 と 409 を分けるのに使う）。
// ほかの人の申請は、あることも見せないように「ない」として扱う
export function findGuestLostReportId(
  db: Db | Tx,
  id: string,
  guestId: string,
) {
  return db.query.lostReports.findFirst({
    where: and(eq(lostReports.id, id), eq(lostReports.guestId, guestId)),
    columns: { id: true },
  });
}

// guest に返す形の行（toLostReport に渡す）。guest の状態を変える API が、更新したあとの申請を返すのに使う
export function findLostReport(db: Db | Tx, id: string) {
  return db.query.lostReports.findFirst({
    where: eq(lostReports.id, id),
    with: lostReportWith,
  });
}

// 「申-00118」や「118」から数値部分を取り出す（該当しなければ null）
function parseLostReportNumber(q: string): number | null {
  const match = q.match(/^(?:申-?)?0*(\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isSafeInteger(num) && num >= 1 && num <= 2_147_483_647
    ? num
    : null;
}

// GET /api/lost-reports の絞り込み条件（admin）
export function lostReportFilters(query: LostReportListQuery) {
  const number = query.q ? parseLostReportNumber(query.q) : null;

  return and(
    query.q
      ? or(
          number != null ? eq(lostReports.number, number) : undefined,
          ilike(lostReports.note, containsPattern(query.q)),
          ilike(lostReports.lostPlace, containsPattern(query.q)),
        )
      : undefined,
    query.status ? inArray(lostReports.status, query.status) : undefined,
    query.categoryId != null
      ? eq(lostReports.categoryId, query.categoryId)
      : undefined,
    query.awaitingReply != null
      ? query.awaitingReply
        ? awaitingReplyWhere
        : not(awaitingReplyWhere)
      : undefined,
  );
}
