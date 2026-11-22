import {
  CANCEL_REASONS,
  FOUND_STATUSES,
  ITEM_COLORS,
  LOST_STATUSES,
  PICKUP_METHODS,
} from "@/db/enums";
import { Category } from "./category";
import { z } from "./zod";

// 複数の API で使う部品。

// --- enum（値は DB と同じ。src/db/enums.ts） ---------------------------------
export const FoundStatus = z.enum(FOUND_STATUSES).openapi("FoundStatus");
export const LostStatus = z.enum(LOST_STATUSES).openapi("LostStatus");
export const PickupMethod = z.enum(PICKUP_METHODS).openapi("PickupMethod");
export const CancelReason = z.enum(CANCEL_REASONS).openapi("CancelReason");
export const ItemColor = z.enum(ITEM_COLORS).openapi("ItemColor");

// 日時は ISO 8601 の文字列（例 2026-09-19T04:35:00.000Z）
export const DateTime = z.iso.datetime({ offset: true });

// 一覧などに埋め込むカテゴリ
export const CategoryRef = Category.pick({ id: true, name: true });

// --- クエリ文字列 ------------------------------------------------------------

// 一覧の ?page=1&limit=20
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ?categoryId=3 のような ID（DB の smallint に入る 1〜32767。範囲外を DB まで送ると 500 になるため）
export const SmallIdQuery = z.coerce
  .number()
  .int()
  .min(1)
  .max(32767)
  .openapi({ type: "integer", minimum: 1, maximum: 32767 });

// ?q=財布 のような検索の文字列。前後の空白（全角も）を除き、空になったら指定なしにする
export const SearchQuery = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .openapi({ type: "string" });

// ?foundFrom=2026-09-19T10:00:00%2B09:00 のような日時。`+` をエンコードせずに送ると、
// クエリ文字列の決まりで空白になって届くので、空白を `+` に戻してから確かめる
// （日時に空白は入らないので、戻しても意味は変わらない）
export const DateTimeQuery = z
  .string()
  .transform((value) => value.replaceAll(" ", "+"))
  .pipe(DateTime)
  .openapi({ type: "string", format: "date-time" });

// ?status=received,matching のようなカンマ区切りの値を、enum の配列にする
export function csvEnum<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1));
}

// ?mine=true のような真偽値（"true" / "false" だけを受ける）
export const BooleanQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

// --- 一覧のレスポンス --------------------------------------------------------

// { items: [...], total: 42 }
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), total: z.number().int() });
}

// DB の OFFSET に変える
export function toOffset({ page, limit }: { page: number; limit: number }) {
  return (page - 1) * limit;
}
