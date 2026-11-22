import {
  CANCEL_REASONS,
  FOUND_STATUSES,
  LOST_STATUSES,
  PICKUP_METHODS,
} from "@/db/enums";
import { z } from "./zod";

// 複数の API で使う部品。

// --- enum（値は DB と同じ。src/db/enums.ts） ---------------------------------
export const FoundStatus = z.enum(FOUND_STATUSES).openapi("FoundStatus");
export const LostStatus = z.enum(LOST_STATUSES).openapi("LostStatus");
export const PickupMethod = z.enum(PICKUP_METHODS).openapi("PickupMethod");
export const CancelReason = z.enum(CANCEL_REASONS).openapi("CancelReason");

// 日時は ISO 8601 の文字列（例 2026-09-19T04:35:00.000Z）
export const DateTime = z.iso.datetime({ offset: true });

// 一覧などに埋め込むカテゴリ
export const CategoryRef = z.object({ id: z.number().int(), name: z.string() });

// --- クエリ文字列 ------------------------------------------------------------

// 一覧の ?page=1&limit=20
export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

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
