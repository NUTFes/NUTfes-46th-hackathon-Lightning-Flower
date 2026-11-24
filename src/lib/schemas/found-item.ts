import {
  BooleanQuery,
  CategoryRef,
  csvEnum,
  DateTime,
  DateTimeQuery,
  FoundStatus,
  ItemColor,
  PageQuery,
  paginated,
  SearchQuery,
  SmallIdQuery,
} from "./common";
import { FOUND_STATUSES, ITEM_COLORS } from "@/db/enums";
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
    color: ItemColor,
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
  color: csvEnum(ITEM_COLORS)
    .optional()
    .openapi({
      type: "string",
      description: `カンマ区切りで複数（${ITEM_COLORS.join(" / ")}）。紺と青のように呼び方が揺れる色をまとめて探す`,
      example: "navy,blue",
    }),
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

function hasNoNullByte(value: string): boolean {
  return !value.includes("\0");
}

function isSafePhotoPath(value: string): boolean {
  if (!value.startsWith("found/") || value.length <= "found/".length) {
    return false;
  }
  if (value.includes("..") || !hasNoNullByte(value)) {
    return false;
  }
  if (/%2e/i.test(value) || value.includes("\\") || value.includes("//")) {
    return false;
  }
  return true;
}

const NonEmptySafeText = z.string().trim().min(1).refine(hasNoNullByte, {
  message: "NUL 文字は含められません",
});

const SmallId = z.number().int().min(1).max(32767);

// API で 1 つの拾得物に付けられる写真の枚数の上限（登録と編集で同じ）。
// 画面（M02・M04）の上限は src/lib/constants.ts の MAX_PHOTOS で、こちらより少ない
export const MAX_FOUND_ITEM_PHOTOS = 10;

export const FoundItemPhotoInput = z
  .object({
    path: z.string().trim().min(1).refine(isSafePhotoPath, {
      message: "path は found/ から始まる有効なパスを指定してください",
    }),
    thumbPath: z.string().trim().min(1).refine(isSafePhotoPath, {
      message: "thumbPath は found/ から始まる有効なパスを指定してください",
    }),
  })
  .refine((photo) => photo.path !== photo.thumbPath, {
    message: "path と thumbPath は別のパスを指定してください",
    path: ["thumbPath"],
  });

export const FoundItemCreateBody = z
  .object({
    categoryId: SmallId,
    color: ItemColor,
    brand: NonEmptySafeText.nullable().optional(),
    foundPlace: NonEmptySafeText,
    foundAt: DateTime.optional(),
    isValuable: z.boolean().optional(),
    memo: NonEmptySafeText.nullable().optional(),
    photos: z
      .array(FoundItemPhotoInput)
      .max(
        MAX_FOUND_ITEM_PHOTOS,
        `写真は最大 ${MAX_FOUND_ITEM_PHOTOS} 件まで登録できます`,
      )
      .refine(
        (photos) => {
          const seen = new Set<string>();
          for (const p of photos) {
            if (seen.has(p.path) || seen.has(p.thumbPath)) {
              return false;
            }
            seen.add(p.path);
            seen.add(p.thumbPath);
          }
          return true;
        },
        {
          message: "同じ写真パスを重複して指定できません",
          path: ["photos"],
        },
      ),
  })
  .openapi("FoundItemCreateBody");

export type FoundItemCreateBody = z.infer<typeof FoundItemCreateBody>;
export const FoundItemIdParams = z.object({
  id: z.uuid(),
});

export const PatchFoundItemBody = z
  .object({
    categoryId: SmallIdQuery.optional(),
    color: ItemColor.optional(),
    brand: NonEmptySafeText.nullable().optional(),
    foundPlace: NonEmptySafeText.optional(),
    foundAt: DateTime.optional(),
    isValuable: z.boolean().optional(),
    memo: NonEmptySafeText.nullable().optional(),
    // 新しく足す写真（POST /api/photos/upload-urls で上げたもの）。keepPhotoIds の写真のあとに並べる
    photos: z
      .array(FoundItemPhotoInput)
      .max(
        MAX_FOUND_ITEM_PHOTOS,
        `写真は最大 ${MAX_FOUND_ITEM_PHOTOS} 件まで登録できます`,
      )
      .refine(
        (photos) => {
          const seen = new Set<string>();
          for (const p of photos) {
            if (seen.has(p.path) || seen.has(p.thumbPath)) {
              return false;
            }
            seen.add(p.path);
            seen.add(p.thumbPath);
          }
          return true;
        },
        {
          message: "同じ写真パスを重複して指定できません",
          path: ["photos"],
        },
      )
      .optional(),
    // 残す写真の ID（GET の FoundItem.photos[].id）。この順に並べ、入っていない写真は外す
    keepPhotoIds: z
      .array(z.uuid())
      .max(
        MAX_FOUND_ITEM_PHOTOS,
        `写真は最大 ${MAX_FOUND_ITEM_PHOTOS} 件まで登録できます`,
      )
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "同じ写真を重複して指定できません",
      })
      .optional()
      .openapi({
        description:
          "残す写真の ID。この順に並べたあとに photos を続け、入っていない写真は外す。" +
          "photos だけを送ったときは、今の写真をすべて外す（丸ごと置き換え）。どちらも送らなければ写真は変えない",
      }),
  })
  .refine(
    (body) =>
      (body.keepPhotoIds?.length ?? 0) + (body.photos?.length ?? 0) <=
      MAX_FOUND_ITEM_PHOTOS,
    {
      message: `写真は最大 ${MAX_FOUND_ITEM_PHOTOS} 件まで登録できます`,
      path: ["photos"],
    },
  );

export type FoundItemPhotoInput = z.infer<typeof FoundItemPhotoInput>;
export type FoundItemIdParams = z.infer<typeof FoundItemIdParams>;
export type PatchFoundItemBody = z.infer<typeof PatchFoundItemBody>;

// --- 状態を変える API の入力（#14） ------------------------------------------

// POST /api/found-items/{id}/handover の本文。入力はない（受け渡しの時刻はサーバーの今の時刻、受け取った人の名前は入れない）。
// 古い画面が handedAt・receiverName を送ってきても、400 にせずに捨てる（z.object は知らないキーを落とす）
export const HandoverBody = z.object({}).openapi("HandoverBody");

// 手で変えられるステータス。紐づけがないときの「受理」と「警察へ移管」「処分」の行き来だけで、
// 照合中・受け渡し待ち・解決済みには、紐づけ・受け取り方法・受け渡しの API でしか変わらない
export const MANUAL_FOUND_STATUSES = [
  "received",
  "transferred_to_police",
  "disposed",
] as const satisfies readonly (typeof FOUND_STATUSES)[number][];

// PATCH /api/found-items/{id}/status の本文。手で変えられない値は 400 にする（bulk-status とそろえる）
export const FoundItemStatusBody = z
  .object({ status: z.enum(MANUAL_FOUND_STATUSES) })
  .openapi("FoundItemStatusBody");

// POST /api/found-items/bulk-status の本文
export const BulkStatusBody = z
  .object({
    foundItemIds: z
      .array(z.uuid())
      .min(1)
      .max(500)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "同じ拾得物を重複して指定できません",
      }),
    status: z.enum(["transferred_to_police", "disposed"]),
    // 預り書の番号など
    note: NonEmptySafeText.nullable().optional(),
  })
  .openapi("BulkStatusBody");

export const BulkStatusResult = z
  .object({ updated: z.number().int() })
  .openapi("BulkStatusResult");

export type HandoverBody = z.infer<typeof HandoverBody>;
export type FoundItemStatusBody = z.infer<typeof FoundItemStatusBody>;
export type BulkStatusBody = z.infer<typeof BulkStatusBody>;
export type BulkStatusResult = z.infer<typeof BulkStatusResult>;
