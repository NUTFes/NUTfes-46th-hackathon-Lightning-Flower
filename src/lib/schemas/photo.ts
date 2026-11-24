import { z } from "./zod";

// 写真のアップロード URL（POST /api/photos/upload-urls）の入出力

// 1 回に発行できる枚数の上限（M02 で 1 件に付ける写真の枚数）
export const MAX_PHOTO_UPLOAD_COUNT = 5;

export const PhotoUploadUrlsBody = z
  .object({ count: z.number().int().min(1).max(MAX_PHOTO_UPLOAD_COUNT) })
  .openapi("PhotoUploadUrlsBody");

// path・thumbPath をそのまま拾得物の登録（photos）に渡す。
// uploadUrl・thumbUploadUrl に画像を PUT する（Content-Type に image/jpeg・image/png・image/webp を付ける）
export const PhotoUploadUrl = z
  .object({
    path: z.string(),
    uploadUrl: z.string(),
    thumbPath: z.string(),
    thumbUploadUrl: z.string(),
  })
  .openapi("PhotoUploadUrl");

export const PhotoUploadUrls = z
  .object({ items: z.array(PhotoUploadUrl) })
  .openapi("PhotoUploadUrls");

// 拾得物に付ける写真のファイルが Storage にないとき（登録 POST /api/found-items・編集 PATCH /api/found-items/{id} の 400）の文言。
// 画面はこの文言で見分け、上げ済みの写真の使い回しをやめて、次に送るときに上げ直す
// （まとめて消したあとに、登録・編集の画面が 1 日以上前に上げた写真を送ったときに出る）
export const PHOTO_FILE_MISSING_MESSAGE =
  "写真のファイルが見つかりませんでした。もう一度送ると、写真を上げ直します";

// 使われていない写真のファイルの削除（POST /api/photos/cleanup）の結果。
// deleted は消したファイルの数（写真 1 枚は、元の画像とサムネイルの 2 ファイル）
export const PhotoCleanupResult = z
  .object({ deleted: z.number().int().min(0) })
  .openapi("PhotoCleanupResult");

export type PhotoUploadUrlsBody = z.infer<typeof PhotoUploadUrlsBody>;
export type PhotoUploadUrl = z.infer<typeof PhotoUploadUrl>;
export type PhotoUploadUrls = z.infer<typeof PhotoUploadUrls>;
export type PhotoCleanupResult = z.infer<typeof PhotoCleanupResult>;
