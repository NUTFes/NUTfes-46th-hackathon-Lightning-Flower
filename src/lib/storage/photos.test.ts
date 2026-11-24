import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findMissingPhotoFiles,
  listPhotoFiles,
  removePhotoFiles,
} from "./photos";

// Storage は mock にする。list はページの中身を、remove は渡したパスを記録する
const list = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const exists = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn(() => ({ list, remove, exists })));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ storage: { from } }),
}));

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const file = (name: string, createdAt = "2026-11-20T00:00:00Z") => ({
  name,
  id: `id-${name}`,
  created_at: createdAt,
  updated_at: createdAt,
  last_accessed_at: createdAt,
  metadata: {},
});

beforeEach(() => {
  list.mockReset();
  remove.mockReset();
  exists.mockReset();
  from.mockClear();
});

describe("listPhotoFiles", () => {
  it("空のページが返るまで、offset を進めて全部のページを読む", async () => {
    // 1 ページ目は limit（100）より少なく区切られても、続きを読む
    const page1 = Array.from({ length: 60 }, (_, i) => file(uuid(i)));
    const page2 = [file(`${uuid(60)}_thumb`)];
    list
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const files = await listPhotoFiles();

    expect(from).toHaveBeenCalledWith("photos");
    expect(
      list.mock.calls.map(([folder, options]) => [folder, options.offset]),
    ).toEqual([
      ["found", 0],
      ["found", 60],
      ["found", 61],
    ]);
    expect(files).toHaveLength(61);
    expect(files[0]).toEqual({
      path: `found/${uuid(0)}`,
      createdAt: new Date("2026-11-20T00:00:00Z"),
    });
    expect(files.at(-1)?.path).toBe(`found/${uuid(60)}_thumb`);
  });

  it("フォルダ・名前の形が違うもの・作った時刻がないものは入れない", async () => {
    list
      .mockResolvedValueOnce({
        data: [
          { ...file("sub"), id: null, created_at: null },
          file(".emptyFolderPlaceholder"),
          file("manual.jpg"),
          file(`${uuid(1)}.jpg`),
          { ...file(uuid(2)), created_at: null },
          { ...file(uuid(3)), created_at: "not a date" },
          file(uuid(4)),
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    expect((await listPhotoFiles()).map((f) => f.path)).toEqual([
      `found/${uuid(4)}`,
    ]);
  });

  it("ページの境目で重なったファイルは 1 つにする", async () => {
    list
      .mockResolvedValueOnce({
        data: [file(uuid(1)), file(uuid(2))],
        error: null,
      })
      .mockResolvedValueOnce({ data: [file(uuid(2))], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await listPhotoFiles()).toHaveLength(2);
  });

  it("Storage がエラーを返したら投げる", async () => {
    list.mockResolvedValueOnce({ data: null, error: new Error("down") });
    await expect(listPhotoFiles()).rejects.toThrow("down");
  });
});

describe("removePhotoFiles", () => {
  it("空なら Storage を呼ばない", async () => {
    expect(await removePhotoFiles([])).toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });

  it("100 件ずつに分けて消し、Storage が消したと返した数を合計する", async () => {
    remove.mockImplementation(async (paths: string[]) => ({
      // もうないファイルは返ってこない
      data: paths.slice(1).map((name) => ({ name })),
      error: null,
    }));
    const paths = Array.from({ length: 250 }, (_, i) => `found/${uuid(i)}`);

    // 重なったパスは 1 回だけ送る
    expect(await removePhotoFiles([...paths, paths[0]])).toBe(247);
    expect(remove.mock.calls.map(([chunk]) => chunk.length)).toEqual([
      100, 100, 50,
    ]);
    expect(remove.mock.calls.flatMap(([chunk]) => chunk)).toEqual(paths);
  });

  it("Storage がエラーを返したら投げる", async () => {
    remove.mockResolvedValueOnce({ data: null, error: new Error("down") });
    await expect(removePhotoFiles(["found/x"])).rejects.toThrow("down");
  });
});

describe("findMissingPhotoFiles", () => {
  it("Storage にないファイルのパスだけを返す（重なったパスは 1 回だけ問い合わせる）", async () => {
    exists.mockImplementation(async (path: string) => ({
      data: path !== "found/b_thumb",
      error: null,
    }));
    expect(
      await findMissingPhotoFiles([
        "found/a",
        "found/a_thumb",
        "found/b",
        "found/b_thumb",
        "found/a",
      ]),
    ).toEqual(["found/b_thumb"]);
    expect(exists).toHaveBeenCalledTimes(4);
  });

  it("空なら Storage を呼ばない", async () => {
    expect(await findMissingPhotoFiles([])).toEqual([]);
    expect(exists).not.toHaveBeenCalled();
  });

  it("Storage が「ない」以外のエラーで投げたら、そのまま投げる", async () => {
    exists.mockRejectedValueOnce(new Error("InvalidJWT"));
    await expect(findMissingPhotoFiles(["found/a"])).rejects.toThrow(
      "InvalidJWT",
    );
  });
});
