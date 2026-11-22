import { desc, isNull } from "drizzle-orm";
import type { WithOf } from "@/db";
import { matches, messages } from "@/db/schema";

// 遺失物申請を LostReport / LostReportForAdmin にするために、一緒に取る関連の行
// （db.query.lostReports の with に渡す）。src/lib/serializers/lost-report.ts にそのまま渡せる
// （形が合わなければ型エラーになる）

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
