// enum の値。DB（schema.ts の pgEnum）と API（src/lib/schemas の zod）の両方で使う。
// 画面から import しても Drizzle を読み込まないように、値だけをここに置く。

// 拾得物のステータス
export const FOUND_STATUSES = [
  "received", // 受理
  "matching", // 照合中
  "awaiting_handover", // 受け渡し待ち
  "resolved", // 解決済み
  "transferred_to_police", // 警察へ移管
  "disposed", // 処分
] as const;

// 遺失物申請のステータス
export const LOST_STATUSES = [
  "searching", // 探し中
  "maybe_found", // 見つかったかも
  "awaiting_handover", // 受け渡し待ち
  "resolved", // 解決済み
  "transferred_to_police", // 警察へ移管
  "disposed", // 処分
  "cancelled", // 取り消し済み
] as const;

// 受け取り方法
export const PICKUP_METHODS = [
  "today", // 今日取りに行く
  "later", // 後日取りに行く
  "other", // 自由記述
] as const;

// 取り消しの理由
export const CANCEL_REASONS = [
  "found_myself", // 自分で見つけた
  "no_longer_needed", // もう探さなくていい
  "other", // その他
] as const;

// チャットの送り手
export const SENDER_ROLES = ["admin", "guest"] as const;
