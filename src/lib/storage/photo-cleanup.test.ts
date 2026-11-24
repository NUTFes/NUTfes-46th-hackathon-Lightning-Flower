import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  pickUnusedPhotoPaths,
  removeUnusedPhotoFiles,
  UNUSED_PHOTO_MIN_AGE_MS,
} from "./photo-cleanup";
import type { StoredPhotoFile } from "./photos";

// Storage の一覧・削除と、DB の写真の行を mock にする
const listPhotoFiles = vi.hoisted(() =>
  vi.fn<() => Promise<StoredPhotoFile[]>>(),
);
const removePhotoFiles = vi.hoisted(() =>
  vi.fn(async (paths: string[]) => paths.length),
);
vi.mock("./photos", () => ({ listPhotoFiles, removePhotoFiles }));

const photoRows = vi.hoisted(() =>
  vi.fn<() => { storagePath: string; thumbPath: string }[]>(() => []),
);
const where = vi.hoisted(() => vi.fn(async () => photoRows()));
vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where }) }),
  }),
}));

const now = new Date("2026-11-24T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const DAY = UNUSED_PHOTO_MIN_AGE_MS;

beforeEach(() => {
  listPhotoFiles.mockReset();
  removePhotoFiles.mockClear();
  photoRows.mockReset().mockReturnValue([]);
  where.mockClear();
});

describe("pickUnusedPhotoPaths", () => {
  it("作ってから 1 日たち、使われていないものだけを選ぶ", () => {
    const files: StoredPhotoFile[] = [
      { path: "found/old", createdAt: ago(DAY + 1) },
      { path: "found/just-a-day", createdAt: ago(DAY) },
      { path: "found/new", createdAt: ago(DAY - 1) },
      { path: "found/used", createdAt: ago(DAY * 3) },
    ];
    expect(pickUnusedPhotoPaths(files, new Set(["found/used"]), now)).toEqual([
      "found/old",
      "found/just-a-day",
    ]);
  });
});

describe("removeUnusedPhotoFiles", () => {
  it("古いファイルのうち、写真の行（元の画像・サムネイル）に使われていないものを消す", async () => {
    listPhotoFiles.mockResolvedValue([
      { path: "found/a", createdAt: ago(DAY * 2) },
      { path: "found/a_thumb", createdAt: ago(DAY * 2) },
      { path: "found/b", createdAt: ago(DAY * 2) },
      { path: "found/b_thumb", createdAt: ago(DAY * 2) },
      { path: "found/new", createdAt: ago(60_000) },
    ]);
    photoRows.mockReturnValue([
      { storagePath: "found/a", thumbPath: "found/a_thumb" },
    ]);

    expect(await removeUnusedPhotoFiles(now)).toBe(2);
    expect(removePhotoFiles).toHaveBeenCalledWith(["found/b", "found/b_thumb"]);
  });

  it("古いファイルがなければ、DB を見ずに 0 を返す", async () => {
    listPhotoFiles.mockResolvedValue([
      { path: "found/new", createdAt: ago(60_000) },
    ]);
    expect(await removeUnusedPhotoFiles(now)).toBe(0);
    expect(where).not.toHaveBeenCalled();
    expect(removePhotoFiles).not.toHaveBeenCalled();
  });

  it("DB には 500 件ずつに分けて問い合わせる", async () => {
    listPhotoFiles.mockResolvedValue(
      Array.from({ length: 1200 }, (_, i) => ({
        path: `found/${i}`,
        createdAt: ago(DAY * 2),
      })),
    );
    expect(await removeUnusedPhotoFiles(now)).toBe(1200);
    expect(where).toHaveBeenCalledTimes(3);
  });

  it("DB が失敗したら、何も消さずに投げる", async () => {
    listPhotoFiles.mockResolvedValue([
      { path: "found/a", createdAt: ago(DAY * 2) },
    ]);
    where.mockRejectedValueOnce(new Error("db down"));
    await expect(removeUnusedPhotoFiles(now)).rejects.toThrow("db down");
    expect(removePhotoFiles).not.toHaveBeenCalled();
  });
});
