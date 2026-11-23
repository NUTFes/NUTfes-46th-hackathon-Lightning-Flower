import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { WithOf } from "@/db";
import { containsPattern } from "@/db/like";
import { lostReports, matches, messages } from "@/db/schema";
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
    orderBy: [desc(messages.createdAt)],
    limit: 1,
  },
} satisfies WithOf<"lostReports">;

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

  // 最新のメッセージの sender_role が guest かどうか
  const latestSenderIsGuest = sql<boolean>`(
    select ${messages.senderRole}
    from ${messages}
    where ${messages.lostReportId} = ${lostReports.id}
    order by ${messages.createdAt} desc
    limit 1
  ) = 'guest'`;

  return and(
    query.q
      ? or(
          number != null ? eq(lostReports.number, number) : undefined,
          ilike(lostReports.brand, containsPattern(query.q)),
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
        ? latestSenderIsGuest
        : sql`coalesce(${latestSenderIsGuest}, false) is false`
      : undefined,
  );
}
