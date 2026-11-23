import type {
  CancelReason,
  FoundItemStatus,
  ItemColor,
  LostReportStatus,
  PickupMethod,
} from "@/lib/types";

// 画面に出す文言と、画面で使う決まった値。enum の値そのものは src/db/enums.ts にある。

// --- ステータス --------------------------------------------------------------

export const FOUND_STATUS_LABELS: Record<FoundItemStatus, string> = {
  received: "受理",
  matching: "照合中",
  awaiting_handover: "受け渡し待ち",
  resolved: "解決済み",
  transferred_to_police: "警察へ移管",
  disposed: "処分",
};

export const LOST_STATUS_LABELS: Record<LostReportStatus, string> = {
  searching: "探し中",
  maybe_found: "見つかったかも",
  awaiting_handover: "受け渡し待ち",
  resolved: "解決済み",
  transferred_to_police: "警察へ移管",
  disposed: "処分",
  cancelled: "取り消し済み",
};

// Chakra の colorPalette。バッジの色に使う
export const FOUND_STATUS_PALETTES: Record<FoundItemStatus, string> = {
  received: "blue",
  matching: "orange",
  awaiting_handover: "purple",
  resolved: "green",
  transferred_to_police: "gray",
  disposed: "gray",
};

export const LOST_STATUS_PALETTES: Record<LostReportStatus, string> = {
  searching: "blue",
  maybe_found: "orange",
  awaiting_handover: "purple",
  resolved: "green",
  transferred_to_police: "gray",
  disposed: "gray",
  cancelled: "gray",
};

// --- 色 ----------------------------------------------------------------------

export const ITEM_COLOR_LABELS: Record<ItemColor, string> = {
  black: "黒",
  white: "白",
  gray: "灰",
  brown: "茶",
  beige: "ベージュ",
  red: "赤",
  pink: "ピンク",
  orange: "オレンジ",
  yellow: "黄",
  green: "緑",
  blue: "青",
  navy: "紺",
  purple: "紫",
  gold: "金",
  silver: "銀",
  clear: "透明",
  other: "その他",
};

// 色の見本（丸い印）に使う CSS の色
export const ITEM_COLOR_SWATCHES: Record<ItemColor, string> = {
  black: "#1a1a1a",
  white: "#ffffff",
  gray: "#9e9e9e",
  brown: "#795548",
  beige: "#e8d8b8",
  red: "#e53935",
  pink: "#f48fb1",
  orange: "#fb8c00",
  yellow: "#fdd835",
  green: "#43a047",
  blue: "#1e88e5",
  navy: "#1a237e",
  purple: "#8e24aa",
  gold: "#d4af37",
  silver: "#c0c0c0",
  clear: "transparent",
  other: "transparent",
};

// --- 受け取り・取り消し ------------------------------------------------------

export const PICKUP_METHOD_LABELS: Record<PickupMethod, string> = {
  today: "今日取りに行く",
  later: "後日取りに行く",
  other: "その他（自由記述）",
};

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  found_myself: "自分で見つけた",
  no_longer_needed: "もう探さなくていい",
  other: "その他",
};

// --- 拾得物の登録 ------------------------------------------------------------

// 「証明書・カード・定期券類」のカテゴリ ID（src/db/migrations/0001_seed_categories.sql）。
// 個人情報が写るので、このカテゴリだけ写真を任意にする
export const ID_CARD_CATEGORY_ID = 1;

export function isPhotoRequired(categoryId: number | null | undefined) {
  return categoryId !== ID_CARD_CATEGORY_ID;
}

// 1 件の拾得物に付けられる写真の枚数
export const MAX_PHOTOS = 4;

// 拾った場所・なくした場所のエリア。
// TODO: 技大祭の会場図が決まったら差し替える
export const PLACE_AREAS = [
  "本部",
  "正門付近",
  "メインステージ",
  "模擬店エリア",
  "体育館",
  "講義棟",
  "食堂",
  "駐車場",
  "その他",
] as const;

// --- 日時 --------------------------------------------------------------------

// 技大祭は日本で開くので、画面の日時は日本時間で扱う
// （サーバーの時刻帯に左右されず、サーバーとブラウザで同じ表示にするため）
const TIME_ZONE = "Asia/Tokyo";

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// 例：9/19 13:35
export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso));
}

// ISO 8601 → <input type="datetime-local"> の値（日本時間の YYYY-MM-DDTHH:mm）
export function toLocalInputValue(iso: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// <input type="datetime-local"> の値（日本時間）→ ISO 8601。読めない値なら ""（スキーマの確認で落とす）
export function fromLocalInputValue(value: string) {
  const date = new Date(`${value}:00+09:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
