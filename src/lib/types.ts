import type {
  CANCEL_REASONS,
  FOUND_STATUSES,
  ITEM_COLORS,
  LOST_STATUSES,
  PICKUP_METHODS,
} from "@/db/enums";
import type { FoundItem } from "@/lib/schemas/found-item";

// 画面の部品で使う型。値は src/db/enums.ts にある（ここでは型だけを作る）

export type FoundItemStatus = (typeof FOUND_STATUSES)[number];
export type LostReportStatus = (typeof LOST_STATUSES)[number];
export type ItemColor = (typeof ITEM_COLORS)[number];
export type PickupMethod = (typeof PICKUP_METHODS)[number];
export type CancelReason = (typeof CANCEL_REASONS)[number];

// ログインした人の役割（Cloudflare Access のメールアドレスで admin / member、Supabase Auth なら guest）
export type Role = "admin" | "member" | "guest";

// 一覧・カード・照合画面で使う拾得物の要約（一覧 API の FoundItem から、詳細だけの項目を除いたもの）
export type FoundItemSummary = Pick<
  FoundItem,
  | "id"
  | "displayNumber"
  | "status"
  | "category"
  | "color"
  | "brand"
  | "foundPlace"
  | "foundAt"
  | "isValuable"
  | "photos"
  | "registeredByEmail"
  | "activeMatch"
>;
