import {
  CANCEL_REASONS,
  FOUND_STATUSES,
  ITEM_COLORS,
  PICKUP_METHODS,
} from "@/db/enums";
import { isPhotoRequired, MAX_PHOTOS } from "@/lib/constants";
import { FoundItemPhotoInput } from "./found-item";
import { z } from "./zod";

// フォームから Server Action に渡す値。Server Action でも同じスキーマで確かめ直す
// （画面の確認は飛ばせるので、サーバーで信用しない）。
// 項目の形と制限は API のリクエストボディ（src/lib/schemas/*.ts）に合わせ、エラー文だけ足す。
// 文字数の上限などを足したいときは、フォームではなく API 側のスキーマに入れる。

const SmallId = z
  .number("カテゴリを選んでください")
  .int()
  .min(1, "カテゴリを選んでください")
  .max(32767);

// common.ts の DateTime と同じ形（オフセット付きの ISO 8601）
const DateTime = z.iso.datetime({
  offset: true,
  error: "日時を入力してください",
});

const Color = z.enum(ITEM_COLORS, "色を選んでください");

// 空文字は null にする任意の文字列（API は空文字を受け付けない）
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable();

const requiredText = (message: string) => z.string().trim().min(1, message);

// --- 拾得物（M02・M04・A03） --------------------------------------------------

// POST /api/found-items（FoundItemCreateBody）・PATCH /api/found-items/{id} と同じ項目。
// 写真は先に Storage に上げ、そのパス（photos）を渡す（Server Action の body の上限 1MB を超えないように）。
// 編集のときに残す既存の写真は keepPhotoIds で渡す。
// TODO: PATCH の photos は全部の写真のパスを受け取るので、既存の写真のパスを API から取れるようにするか、
// 残す写真の ID で受け取れるようにするかを API 担当と決める
// refine を付けると .omit() を使えないので、項目だけのものを分けておく
export const FoundItemFields = z.object({
  photos: z.array(FoundItemPhotoInput),
  keepPhotoIds: z.array(z.uuid()),
  categoryId: SmallId,
  color: Color,
  brand: optionalText,
  foundPlace: requiredText("拾った場所を選んでください"),
  foundAt: DateTime,
  isValuable: z.boolean(),
  memo: optionalText,
});

// 写真の枚数の確認。問題なければ null（フォームでは、写真を上げる前にも使う）
export function photoCountError(count: number, categoryId: number) {
  if (count > MAX_PHOTOS) return `写真は ${MAX_PHOTOS} 枚までです`;
  if (count === 0 && isPhotoRequired(categoryId)) {
    return "写真を 1 枚以上撮ってください";
  }
  return null;
}

export const FoundItemInput = FoundItemFields.superRefine((input, ctx) => {
  const message = photoCountError(
    input.photos.length + input.keepPhotoIds.length,
    input.categoryId,
  );
  if (message) ctx.addIssue({ code: "custom", path: ["photos"], message });
});

export type FoundItemInput = z.output<typeof FoundItemInput>;

// --- 遺失物申請（G03・G04・G05） ----------------------------------------------

// POST /api/lost-reports（CreateLostReportBody）・PATCH /api/lost-reports/{id}（LostReportPatchBody）と同じ項目。
// TODO: #40 がマージされたら CreateLostReportBody.extend({ ... }) でエラー文だけ足す形にする
export const LostReportInput = z.object({
  categoryId: SmallId,
  color: Color,
  brand: optionalText,
  lostPlace: requiredText("なくした場所を入力してください"),
  lostAt: DateTime,
  note: optionalText,
});

export type LostReportInput = z.output<typeof LostReportInput>;

// --- 受け取り方法（G07） ------------------------------------------------------

export const PickupMethodInput = z
  .object({
    reportId: z.uuid(),
    method: z.enum(PICKUP_METHODS, "受け取り方法を選んでください"),
    note: optionalText,
  })
  .refine((input) => input.method !== "other" || input.note, {
    path: ["note"],
    message: "受け取り方法を入力してください",
  });

export type PickupMethodInput = z.output<typeof PickupMethodInput>;

// --- 申請の取り消し（G08） ----------------------------------------------------

export const CancelReportInput = z.object({
  reportId: z.uuid(),
  reason: z.enum(CANCEL_REASONS, "理由を選んでください"),
  // reason が other のときだけ使う
  note: optionalText,
});

export type CancelReportInput = z.output<typeof CancelReportInput>;

// --- admin ---------------------------------------------------------------------

export const StatusChangeInput = z.object({
  itemId: z.uuid(),
  status: z.enum(FOUND_STATUSES),
});

export type StatusChangeInput = z.output<typeof StatusChangeInput>;

// 本部で直接返却（A03）。handovers テーブルの項目に合わせる
// （記録した人 recorded_by_email は、Access の JWT からサーバーで入れる）
export const HandoverInput = z.object({
  itemId: z.uuid(),
  receiverName: requiredText("受け取った人の名前を入力してください"),
  handedAt: DateTime,
});

export type HandoverInput = z.output<typeof HandoverInput>;

// 照合画面（A05）の紐づけ・解除・本人確認へ進む
export const MatchInput = z.object({
  reportId: z.uuid(),
  foundItemId: z.uuid(),
});

export type MatchInput = z.output<typeof MatchInput>;

// 期間終了後の一斉送信（A07）
export const BroadcastInput = z.object({
  body: requiredText("本文を入力してください"),
});

export type BroadcastInput = z.output<typeof BroadcastInput>;
