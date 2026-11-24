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

// 写真のファイルを置くフォルダ（createPhotoUpload のパスの先頭）
const PHOTO_FOLDER = "found";
// createPhotoUpload が作るファイル名（uuid と、サムネイルはその後ろに _thumb）。
// これに合わないもの（フォルダや、手で置いたファイル）は、一覧に入れない（消さない）
const PHOTO_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_thumb)?$/;
// Storage の一覧の 1 ページの数と、ページ数の上限（100 件 × 1000 ページ。止まらなくならないように）
const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 1000;
// Storage の削除で、1 回に送るパスの数
const REMOVE_CHUNK_SIZE = 100;

export type StoredPhotoFile = { path: string; createdAt: Date };

// Storage の found/ にある写真のファイルを、すべてのページから取る。
// 名前の順に取るので、取っているあいだに上がったファイルで境目がずれ、取りこぼすことや重なることがある
// （重なりは除く。取りこぼしたものは、次に消すときに消える）
export async function listPhotoFiles(): Promise<StoredPhotoFile[]> {
  const bucket = createSupabaseAdminClient().storage.from(PHOTO_BUCKET);
  const files = new Map<string, StoredPhotoFile>();
  let offset = 0;
  for (let page = 0; page < LIST_MAX_PAGES; page++) {
    const { data, error } = await bucket.list(PHOTO_FOLDER, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    // Storage が 1 ページの数を limit より小さく区切ることもあるので、空のページが返るまで読む
    if (data.length === 0) return [...files.values()];
    offset += data.length;
    for (const item of data) {
      // フォルダは id と created_at が null
      if (!item.id || !item.created_at || !PHOTO_FILE_NAME.test(item.name)) {
        continue;
      }
      const createdAt = new Date(item.created_at);
      if (Number.isNaN(createdAt.getTime())) continue;
      const path = `${PHOTO_FOLDER}/${item.name}`;
      files.set(path, { path, createdAt });
    }
  }
  throw new Error(
    `Storage の ${PHOTO_FOLDER}/ の一覧が ${LIST_MAX_PAGES} ページで終わりませんでした`,
  );
}

// 写真のファイルを Storage から消す。消したファイルの数を返す（もうないファイルは数えない）
export async function removePhotoFiles(paths: string[]): Promise<number> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return 0;

  const bucket = createSupabaseAdminClient().storage.from(PHOTO_BUCKET);
  let removed = 0;
  for (let start = 0; start < unique.length; start += REMOVE_CHUNK_SIZE) {
    const { data, error } = await bucket.remove(
      unique.slice(start, start + REMOVE_CHUNK_SIZE),
    );
    if (error) throw error;
    removed += data.length;
  }
  return removed;
}

// paths のうち、Storage にファイルがないもの。拾得物に付ける前に、上げたファイルがあるかを確かめる
// （使われていない写真をまとめて消したあとに、画面に残っていた古いパスで保存させないため）。
// Storage が「ない」以外のエラーを返したら投げる
export async function findMissingPhotoFiles(
  paths: string[],
): Promise<string[]> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return [];

  const bucket = createSupabaseAdminClient().storage.from(PHOTO_BUCKET);
  const exists = await Promise.all(
    unique.map(async (path) => (await bucket.exists(path)).data),
  );
  return unique.filter((_, index) => !exists[index]);
}
