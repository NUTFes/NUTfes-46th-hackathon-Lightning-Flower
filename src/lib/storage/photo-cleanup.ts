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

// 確かめてから消すのを、何件ずつにするか（確かめてから消すまでのあいだを短くするため、
// Storage の削除の 1 回分と同じ数にする）
const CHECK_CHUNK_SIZE = 100;

// Storage のファイルのうち、作ってから minAge 以上たったもののパス
export function pickOldPhotoPaths(
  files: StoredPhotoFile[],
  now: Date,
  minAgeMs: number = UNUSED_PHOTO_MIN_AGE_MS,
): string[] {
  const cutoff = now.getTime() - minAgeMs;
  return files
    .filter((file) => file.createdAt.getTime() <= cutoff)
    .map((file) => file.path);
}

// paths のうち、found_item_photos のどれかの行（元の画像かサムネイル）に使われているもの。
// 削除した拾得物の写真の行も「使われている」に入れる（論理削除なので、拾得物と一緒に残す）
async function findUsedPhotoPaths(paths: string[]): Promise<Set<string>> {
  const rows = await getDb()
    .select({
      storagePath: foundItemPhotos.storagePath,
      thumbPath: foundItemPhotos.thumbPath,
    })
    .from(foundItemPhotos)
    .where(
      or(
        inArray(foundItemPhotos.storagePath, paths),
        inArray(foundItemPhotos.thumbPath, paths),
      ),
    );
  return new Set(rows.flatMap((row) => [row.storagePath, row.thumbPath]));
}

// paths のファイルのうち、どの写真の行にも使われていないものだけを Storage から消す。
// 消したファイルの数を返す。found_item_photos のパスには一意の制約がなく、同じファイルを
// 2 つの拾得物が指すことがあるので、消す直前に 100 件ずつ DB で確かめ直す。
// それでも、確かめてから消すまでのあいだに同じパスで登録されたものは消えることがある
export async function removePhotoFilesIfUnused(
  paths: string[],
): Promise<number> {
  const unique = [...new Set(paths)];
  let removed = 0;
  for (let start = 0; start < unique.length; start += CHECK_CHUNK_SIZE) {
    const chunk = unique.slice(start, start + CHECK_CHUNK_SIZE);
    const used = await findUsedPhotoPaths(chunk);
    removed += await removePhotoFiles(chunk.filter((path) => !used.has(path)));
  }
  return removed;
}

// どの拾得物にも使われていない写真のファイルを、Storage からまとめて消す（期間終了処理 A07）。
// 消したファイルの数（元の画像とサムネイルを別に数える）を返す。
// 画面が 1 日以上前に上げた写真を送り直して登録したとき、確かめてから消すまでのあいだだと消えることがある
export async function removeUnusedPhotoFiles(
  now: Date = new Date(),
): Promise<number> {
  const files = await listPhotoFiles();
  return removePhotoFilesIfUnused(pickOldPhotoPaths(files, now));
}
