import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  pickOldPhotoPaths,
  removePhotoFilesIfUnused,
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
  removePhotoFiles
    .mockReset()
    .mockImplementation(async (paths: string[]) => paths.length);
  photoRows.mockReset().mockReturnValue([]);
  where.mockReset().mockImplementation(async () => photoRows());
});

describe("pickOldPhotoPaths", () => {
  it("作ってから 1 日たったものだけを選ぶ", () => {
    const files: StoredPhotoFile[] = [
      { path: "found/old", createdAt: ago(DAY + 1) },
      { path: "found/just-a-day", createdAt: ago(DAY) },
      { path: "found/new", createdAt: ago(DAY - 1) },
    ];
    expect(pickOldPhotoPaths(files, now)).toEqual([
      "found/old",
      "found/just-a-day",
    ]);
  });
});

describe("removePhotoFilesIfUnused", () => {
  it("写真の行（元の画像・サムネイル）に使われていないものだけを消す", async () => {
    photoRows.mockReturnValue([
      { storagePath: "found/a", thumbPath: "found/a_thumb" },
    ]);
    expect(
      await removePhotoFilesIfUnused([
        "found/a",
        "found/a_thumb",
        "found/b",
        "found/b_thumb",
      ]),
    ).toBe(2);
    expect(removePhotoFiles).toHaveBeenCalledWith(["found/b", "found/b_thumb"]);
  });

  it("100 件ずつ、DB で確かめてから消す（確かめてから消すまでを短くする）", async () => {
    const order: string[] = [];
    where.mockImplementation(async () => {
      order.push("check");
      return [];
    });
    removePhotoFiles.mockImplementation(async (paths: string[]) => {
      order.push(`remove:${paths.length}`);
      return paths.length;
    });
    const paths = Array.from({ length: 250 }, (_, i) => `found/${i}`);
    expect(await removePhotoFilesIfUnused([...paths, paths[0]])).toBe(250);
    expect(order).toEqual([
      "check",
      "remove:100",
      "check",
      "remove:100",
      "check",
      "remove:50",
    ]);
  });

  it("空なら DB も Storage も呼ばない", async () => {
    expect(await removePhotoFilesIfUnused([])).toBe(0);
    expect(where).not.toHaveBeenCalled();
    expect(removePhotoFiles).not.toHaveBeenCalled();
  });

  it("DB が失敗したら、そのまとまりは消さずに投げる", async () => {
    where.mockRejectedValueOnce(new Error("db down"));
    await expect(removePhotoFilesIfUnused(["found/a"])).rejects.toThrow(
      "db down",
    );
    expect(removePhotoFiles).not.toHaveBeenCalled();
  });
});

describe("removeUnusedPhotoFiles", () => {
  it("古いファイルのうち、使われていないものを消す（新しいファイルは DB にも問い合わせない）", async () => {
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
});
