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

export type PhotoUploadUrlsBody = z.infer<typeof PhotoUploadUrlsBody>;
export type PhotoUploadUrl = z.infer<typeof PhotoUploadUrl>;
export type PhotoUploadUrls = z.infer<typeof PhotoUploadUrls>;
