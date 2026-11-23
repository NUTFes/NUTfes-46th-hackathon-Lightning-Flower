import type { CancelReason, ItemColor, PickupMethod } from "@/lib/types";

// 画面に出す文言と、画面で使う決まった値。enum の値そのものは src/db/enums.ts にある。
// ステータスの表示名は StatusBadge、色の表示名は FoundItemDetailFields の itemColorLabels、
// 日時の表示は DetailList の formatItemDate を使う（ここには書かない）。

// --- 色 ----------------------------------------------------------------------

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
// 個人情報が写るので、このカテゴリだけ写真を任意にする。
// TODO: シードの ID が変わると壊れるので、categories に「写真を任意にする」フラグを持たせる（DB 担当と相談）
export const ID_CARD_CATEGORY_ID = 1;

export function isPhotoRequired(categoryId: number | null | undefined) {
  return categoryId !== ID_CARD_CATEGORY_ID;
}

// 1 件の拾得物に付けられる写真の枚数（API の上限は 10 枚。画面ではこの枚数までにする）
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

// 学園祭本部の場所（トップ画面などに出す）。
// TODO: 技大祭の会場図が決まったら場所を書く
export const HQ_LOCATION = {
  name: "学園祭本部",
  note: "場所は運用時に記載します",
} as const;
