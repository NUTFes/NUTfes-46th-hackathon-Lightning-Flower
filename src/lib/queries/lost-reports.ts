import { desc, isNull } from "drizzle-orm";
import type { WithOf } from "@/db";
import { matches, messages } from "@/db/schema";

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
