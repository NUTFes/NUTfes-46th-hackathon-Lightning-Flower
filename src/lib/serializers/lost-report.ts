import type { lostReports } from "@/db/schema";
import { formatFoundNumber, formatLostNumber } from "@/lib/display-number";
import type { LostReport, LostReportForAdmin } from "@/lib/schemas/lost-report";

// DB の行を、API の LostReport（guest にも返す形）にする
export type LostReportRow = typeof lostReports.$inferSelect & {
  category: { id: number; name: string };
};

export function toLostReport(row: LostReportRow): LostReport {
  return {
    id: row.id,
    displayNumber: formatLostNumber(row.number),
    status: row.status,
    category: row.category,
    features: row.features,
    brand: row.brand,
    lostPlace: row.lostPlace,
    lostAt: row.lostAt.toISOString(),
    note: row.note,
    verified: row.verifiedAt != null,
    pickup: row.pickupMethod
      ? { method: row.pickupMethod, note: row.pickupNote }
      : null,
    cancel:
      row.cancelReason && row.cancelledAt
        ? {
            reason: row.cancelReason,
            note: row.cancelNote,
            cancelledAt: row.cancelledAt.toISOString(),
          }
        : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// admin に返す形。guest の情報・紐づいた拾得物・返信待ちかを足す
export type LostReportForAdminRow = LostReportRow & {
  guest: { email: string; displayName: string | null };
  // 有効な紐づけ（released_at が NULL のもの）だけ
  matches: { foundItem: { id: string; number: number } }[];
  // 新しい順。最新の 1 件があればよい
  messages: { senderRole: "admin" | "guest" }[];
};

export function toLostReportForAdmin(
  row: LostReportForAdminRow,
): LostReportForAdmin {
  const match = row.matches[0];
  return {
    ...toLostReport(row),
    guest: row.guest,
    activeMatch: match
      ? {
          foundItemId: match.foundItem.id,
          displayNumber: formatFoundNumber(match.foundItem.number),
        }
      : null,
    awaitingReply: row.messages[0]?.senderRole === "guest",
  };
}
