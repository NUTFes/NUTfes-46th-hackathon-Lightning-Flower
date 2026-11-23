import { z } from "zod";
import {
  CANCEL_REASONS,
  FOUND_STATUSES,
  ITEM_COLORS,
  PICKUP_METHODS,
} from "@/db/enums";
import { isPhotoRequired, MAX_PHOTOS } from "@/lib/constants";

// フォームから Server Action に渡す値。Server Action でも同じスキーマで確かめ直す
// （画面の確認は飛ばせるので、サーバーで信用しない）。

const DateTime = z.iso.datetime({
  offset: true,
  error: "日時を正しく入力してください",
});

// 空文字は null にする任意の文字列
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} 文字以内で入力してください`)
    .transform((value) => value || null)
    .nullable();

const requiredText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `${max} 文字以内で入力してください`);

// --- 拾得物（M02・M04・A03） --------------------------------------------------

export const FoundItemInput = z
  .object({
    // 新しく足す写真
    photos: z.array(z.instanceof(File)).max(MAX_PHOTOS),
    // 編集のとき、残す既存の写真の ID（ここにない写真は消す）
    keepPhotoIds: z.array(z.uuid()),
    categoryId: z.number().int().min(1, "カテゴリを選んでください"),
    color: z.enum(ITEM_COLORS, "色を選んでください"),
    brand: optionalText(100),
    foundPlace: requiredText(100, "拾った場所を選んでください"),
    foundAt: DateTime,
    isValuable: z.boolean(),
    memo: optionalText(500),
  })
  .superRefine((input, ctx) => {
    const count = input.photos.length + input.keepPhotoIds.length;
    if (count > MAX_PHOTOS) {
      ctx.addIssue({
        code: "custom",
        path: ["photos"],
        message: `写真は ${MAX_PHOTOS} 枚までです`,
      });
    }
    if (count === 0 && isPhotoRequired(input.categoryId)) {
      ctx.addIssue({
        code: "custom",
        path: ["photos"],
        message: "写真を 1 枚以上撮ってください",
      });
    }
  });

export type FoundItemInput = z.infer<typeof FoundItemInput>;

// --- 遺失物申請（G03・G04・G05） ----------------------------------------------

export const LostReportInput = z.object({
  categoryId: z.number().int().min(1, "カテゴリを選んでください"),
  color: z.enum(ITEM_COLORS, "色を選んでください"),
  brand: optionalText(100),
  lostPlace: requiredText(100, "なくした場所を入力してください"),
  lostAt: DateTime,
  note: optionalText(1000),
});

export type LostReportInput = z.infer<typeof LostReportInput>;

// --- 受け取り方法（G07） ------------------------------------------------------

export const PickupMethodInput = z
  .object({
    reportId: z.uuid(),
    method: z.enum(PICKUP_METHODS, "受け取り方法を選んでください"),
    note: optionalText(500),
  })
  .refine((input) => input.method !== "other" || input.note, {
    path: ["note"],
    message: "受け取り方法を入力してください",
  });

export type PickupMethodInput = z.infer<typeof PickupMethodInput>;

// --- 申請の取り消し（G08） ----------------------------------------------------

export const CancelReportInput = z.object({
  reportId: z.uuid(),
  reason: z.enum(CANCEL_REASONS, "理由を選んでください"),
  // reason が other のときだけ使う
  note: optionalText(500),
});

export type CancelReportInput = z.infer<typeof CancelReportInput>;

// --- admin ---------------------------------------------------------------------

export const StatusChangeInput = z.object({
  itemId: z.uuid(),
  status: z.enum(FOUND_STATUSES),
});

export type StatusChangeInput = z.infer<typeof StatusChangeInput>;

// 本部で直接返却（A03）
export const HandoverInput = z.object({
  itemId: z.uuid(),
  receiverName: requiredText(100, "受け取った人の名前を入力してください"),
  handledBy: requiredText(100, "対応した人を入力してください"),
  handedAt: DateTime,
});

export type HandoverInput = z.infer<typeof HandoverInput>;

// 照合画面（A05）の紐づけ・解除・本人確認へ進む
export const MatchInput = z.object({
  reportId: z.uuid(),
  foundItemId: z.uuid(),
});

export type MatchInput = z.infer<typeof MatchInput>;

// 期間終了後の一斉送信（A07）
export const BroadcastInput = z.object({
  body: requiredText(2000, "本文を入力してください"),
});
