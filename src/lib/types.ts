import type { CANCEL_REASONS, ITEM_COLORS, PICKUP_METHODS } from "@/db/enums";

// 画面の部品で使う型。値は src/db/enums.ts にある（ここでは型だけを作る）。
// ステータスの型（FoundItemStatus・LostReportStatus）は StatusBadge、役割は Me["role"] を使う。

export type ItemColor = (typeof ITEM_COLORS)[number];
export type PickupMethod = (typeof PICKUP_METHODS)[number];
export type CancelReason = (typeof CANCEL_REASONS)[number];
