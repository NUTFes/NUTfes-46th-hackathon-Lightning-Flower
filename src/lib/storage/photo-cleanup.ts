import { inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItemPhotos } from "@/db/schema";
import {
  listPhotoFiles,
  removePhotoFiles,
  type StoredPhotoFile,
} from "./photos";

// 使われていないファイルを消す対象にするまでの時間。写真は登録・保存の前に上げるので、
// 上げたばかりのファイル（登録の途中）を消さないよう、作ってから 1 日たったものだけを消す
// （アップロード URL の有効期限は 2 時間）
export const UNUSED_PHOTO_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// DB に IN で一度に渡すパスの数
const DB_CHUNK_SIZE = 500;

// Storage のファイルのうち、作ってから minAge 以上たち、どの写真の行にも使われていないもののパス
export function pickUnusedPhotoPaths(
  files: StoredPhotoFile[],
  usedPaths: ReadonlySet<string>,
  now: Date,
  minAgeMs: number = UNUSED_PHOTO_MIN_AGE_MS,
): string[] {
  const cutoff = now.getTime() - minAgeMs;
  return files
    .filter(
      (file) => file.createdAt.getTime() <= cutoff && !usedPaths.has(file.path),
    )
    .map((file) => file.path);
}

// paths のうち、found_item_photos のどれかの行（元の画像かサムネイル）に使われているもの。
// 削除した拾得物の写真の行も「使われている」に入れる（論理削除なので、拾得物と一緒に残す）
async function findUsedPhotoPaths(paths: string[]): Promise<Set<string>> {
  const used = new Set<string>();
  const db = getDb();
  for (let start = 0; start < paths.length; start += DB_CHUNK_SIZE) {
    const chunk = paths.slice(start, start + DB_CHUNK_SIZE);
    const rows = await db
      .select({
        storagePath: foundItemPhotos.storagePath,
        thumbPath: foundItemPhotos.thumbPath,
      })
      .from(foundItemPhotos)
      .where(
        or(
          inArray(foundItemPhotos.storagePath, chunk),
          inArray(foundItemPhotos.thumbPath, chunk),
        ),
      );
    for (const row of rows) {
      used.add(row.storagePath);
      used.add(row.thumbPath);
    }
  }
  return used;
}

// どの拾得物にも使われていない写真のファイルを、Storage からまとめて消す（期間終了処理 A07）。
// 消したファイルの数（元の画像とサムネイルを別に数える）を返す。
// Storage の一覧を取ってから DB を見るので、そのあいだに古いパスを使って登録し直したもの
// （画面が 1 日以上前に上げた写真を送り直したなど）は消えることがある
export async function removeUnusedPhotoFiles(
  now: Date = new Date(),
): Promise<number> {
  const files = await listPhotoFiles();
  const cutoff = now.getTime() - UNUSED_PHOTO_MIN_AGE_MS;
  const oldFiles = files.filter((file) => file.createdAt.getTime() <= cutoff);
  if (oldFiles.length === 0) return 0;

  const used = await findUsedPhotoPaths(oldFiles.map((file) => file.path));
  return removePhotoFiles(pickUnusedPhotoPaths(oldFiles, used, now));
}
