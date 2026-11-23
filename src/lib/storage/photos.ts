import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// 拾得物の写真を置く、非公開のバケット（supabase/config.toml）
export const PHOTO_BUCKET = "photos";

// 表示用の署名付き URL の有効期限（秒）
const SIGNED_URL_EXPIRES_IN = 60 * 60;

export type PhotoUrlOf = (path: string) => string;

// Storage のパスの一覧から、表示用の署名付き URL を 1 回でまとめて作る。
// 返り値の関数にパスを渡すと URL が返る（一覧の全部の写真を、1 件ずつ問い合わせないため）
export async function signPhotoUrls(paths: string[]): Promise<PhotoUrlOf> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return () => "";

  const { data, error } = await createSupabaseAdminClient()
    .storage.from(PHOTO_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_EXPIRES_IN);
  if (error) throw error;

  const urls = new Map(
    data.flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
  // ファイルがないなどで URL を作れなかった写真は "" にする（画面では表示しない）
  return (path) => urls.get(path) ?? "";
}

export type PhotoUpload = {
  path: string;
  uploadUrl: string;
  thumbPath: string;
  thumbUploadUrl: string;
};

// 写真 1 枚ぶん（元の画像とサムネイル）の、アップロード先のパスと署名付きアップロード URL を作る。
// パスはサーバーで決める（推測できない uuid。拾得物の登録の isSafePhotoPath を通る形）。
// アップロード先のパスは URL に固定され、upsert を付けないので、すでにあるファイルは上書きできない
export async function createPhotoUpload(): Promise<PhotoUpload> {
  const id = crypto.randomUUID();
  const path = `found/${id}`;
  const thumbPath = `found/${id}_thumb`;

  const bucket = createSupabaseAdminClient().storage.from(PHOTO_BUCKET);
  const [photo, thumb] = await Promise.all([
    bucket.createSignedUploadUrl(path),
    bucket.createSignedUploadUrl(thumbPath),
  ]);
  if (photo.error) throw photo.error;
  if (thumb.error) throw thumb.error;

  return {
    path,
    uploadUrl: photo.data.signedUrl,
    thumbPath,
    thumbUploadUrl: thumb.data.signedUrl,
  };
}
