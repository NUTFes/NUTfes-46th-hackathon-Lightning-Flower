import { desc, eq, isNull } from "drizzle-orm";
import type { Db, Tx, WithOf } from "@/db";
import { lostReports, matches, messages } from "@/db/schema";

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
