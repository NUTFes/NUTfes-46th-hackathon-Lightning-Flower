import {
  BooleanQuery,
  CategoryRef,
  csvEnum,
  DateTime,
  FoundStatus,
  PageQuery,
  paginated,
} from "./common";
import { FOUND_STATUSES } from "@/db/enums";
import { z } from "./zod";

// 拾得物（Notion 設計仕様「API設計」の FoundItem）

export const FoundItemPhoto = z.object({
  id: z.uuid(),
  url: z.string(), // 署名付き URL（期限つき）
  thumbUrl: z.string(), // 一覧用のサムネイルの署名付き URL
});

export const FoundItem = z
  .object({
    id: z.uuid(),
    displayNumber: z.string().openapi({ example: "拾-00042" }),
    status: FoundStatus,
    category: CategoryRef,
    features: z.string(),
    brand: z.string().nullable(),
    foundPlace: z.string(),
    foundAt: DateTime,
    isValuable: z.boolean(),
    memo: z.string().nullable(),
    // 一覧では 1 枚目だけ
    photos: z.array(FoundItemPhoto),
    registeredByEmail: z.string(),
    // 自分の登録か admin なら true（画面の編集・削除ボタンの表示に使う）
    canEdit: z.boolean(),
    // 有効な紐づけ。なければ null
    activeMatch: z
      .object({ lostReportId: z.uuid(), displayNumber: z.string() })
      .nullable(),
    // 解決済みなら受け渡しの記録。なければ null
    handover: z
      .object({ handedAt: DateTime, receiverName: z.string().nullable() })
      .nullable(),
    createdAt: DateTime,
  })
  .openapi("FoundItem");

export const FoundItemList = paginated(FoundItem).openapi("FoundItemList");

// GET /api/found-items のクエリ
export const FoundItemListQuery = PageQuery.extend({
  q: z
    .string()
    .trim()
    .min(1)
    .optional()
    .openapi({ description: "特徴・ブランド・メモ・場所の部分一致" }),
  status: csvEnum(FOUND_STATUSES)
    .optional()
    .openapi({
      type: "string",
      description: `カンマ区切りで複数（${FOUND_STATUSES.join(" / ")}）`,
      example: "received,matching",
    }),
  categoryId: z.coerce.number().int().optional().openapi({ type: "integer" }),
  place: z
    .string()
    .trim()
    .min(1)
    .optional()
    .openapi({ description: "拾った場所の部分一致" }),
  foundFrom: DateTime.optional().openapi({
    description: "この日時以降に拾ったもの",
  }),
  foundTo: DateTime.optional().openapi({
    description: "この日時以前に拾ったもの",
  }),
  mine: BooleanQuery.optional().openapi({
    description: "true なら自分の登録だけ",
  }),
});

export type FoundItem = z.infer<typeof FoundItem>;
export type FoundItemList = z.infer<typeof FoundItemList>;
export type FoundItemListQuery = z.infer<typeof FoundItemListQuery>;
