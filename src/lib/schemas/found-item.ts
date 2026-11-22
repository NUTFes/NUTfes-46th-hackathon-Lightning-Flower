import {
  BooleanQuery,
  CategoryRef,
  Color,
  csvEnum,
  DateTime,
  DateTimeQuery,
  FoundStatus,
  PageQuery,
  paginated,
  SearchQuery,
  SmallIdQuery,
} from "./common";
import { FOUND_STATUSES } from "@/db/enums";
import { z } from "./zod";

// 拾得物（Notion 設計仕様「API設計」の FoundItem）

export const FoundItemPhoto = z.object({
  id: z.uuid(),
  url: z.string(), // 署名付き URL（期限つき）。一覧では ""
  thumbUrl: z.string(), // 一覧用のサムネイルの署名付き URL
});

export const FoundItem = z
  .object({
    id: z.uuid(),
    displayNumber: z.string().openapi({ example: "拾-00042" }),
    status: FoundStatus,
    category: CategoryRef,
    color: Color,
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

// GET /api/found-items のクエリの、日時の前後を確かめる前の形。
// zod では refine を付けたスキーマに .pick() / .omit() を使えないので、項目を減らして使うときは
// こちらから作り、withFoundRangeCheck を付け直す（例：withFoundRangeCheck(FoundItemListQueryBase.omit({ mine: true }))）
export const FoundItemListQueryBase = PageQuery.extend({
  q: SearchQuery.optional().openapi({
    description: "ブランド・メモ・場所の部分一致",
  }),
  status: csvEnum(FOUND_STATUSES)
    .optional()
    .openapi({
      type: "string",
      description: `カンマ区切りで複数（${FOUND_STATUSES.join(" / ")}）`,
      example: "received,matching",
    }),
  categoryId: SmallIdQuery.optional(),
  color: Color.optional(),
  place: SearchQuery.optional().openapi({
    description: "拾った場所の部分一致",
  }),
  foundFrom: DateTimeQuery.optional().openapi({
    description: "この日時以降に拾ったもの",
  }),
  foundTo: DateTimeQuery.optional().openapi({
    description: "この日時以前に拾ったもの",
  }),
  mine: BooleanQuery.optional().openapi({
    description: "true なら自分の登録だけ",
  }),
});

// foundFrom ≦ foundTo を確かめる。前後を逆にしたときに「見つからない」と区別できるように 400 にする
// （オフセットが違うので Date で比べる）
export function withFoundRangeCheck<
  T extends z.ZodType<{ foundFrom?: string; foundTo?: string }>,
>(schema: T) {
  return schema.refine(
    (query) =>
      !query.foundFrom ||
      !query.foundTo ||
      new Date(query.foundFrom) <= new Date(query.foundTo),
    { path: ["foundTo"], message: "foundTo は foundFrom 以降にしてください" },
  );
}

export const FoundItemListQuery = withFoundRangeCheck(FoundItemListQueryBase);

export type FoundItem = z.infer<typeof FoundItem>;
export type FoundItemList = z.infer<typeof FoundItemList>;
export type FoundItemListQuery = z.infer<typeof FoundItemListQuery>;
