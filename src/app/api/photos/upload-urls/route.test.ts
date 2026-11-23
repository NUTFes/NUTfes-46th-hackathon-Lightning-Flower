import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { FoundItemPhotoInput } from "@/lib/schemas/found-item";
import { PhotoUploadUrls } from "@/lib/schemas/photo";
import { POST } from "./route";

// Storage は mock にする。発行したパスと、パスごとの upsert の指定を記録する
const getActor = vi.hoisted(() => vi.fn<() => Promise<Actor | null>>());
const createSignedUploadUrl = vi.hoisted(() =>
  vi.fn(async (...[path]: [path: string, options?: { upsert: boolean }]) => ({
    data: {
      signedUrl: `http://storage.test/upload/sign/photos/${path}?token=t`,
      token: "t",
      path,
    },
    error: null,
  })),
);
const from = vi.hoisted(() => vi.fn(() => ({ createSignedUploadUrl })));
vi.mock("@/lib/auth/actor", () => ({ getActor }));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ storage: { from } }),
}));

const request = (body: unknown) =>
  new Request("http://localhost/api/photos/upload-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const member: Actor = { role: "member", email: "member@example.com" };

beforeEach(() => {
  getActor.mockReset();
  createSignedUploadUrl.mockClear();
  from.mockClear();
});

describe("POST /api/photos/upload-urls", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await POST(request({ count: 1 }), undefined)).status).toBe(401);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("guest は 403", async () => {
    getActor.mockResolvedValue({
      role: "guest",
      id: "22222222-2222-4222-8222-222222222222",
      email: "g@example.com",
    });
    expect((await POST(request({ count: 1 }), undefined)).status).toBe(403);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["0 枚", { count: 0 }],
    ["6 枚", { count: 6 }],
    ["小数", { count: 1.5 }],
    ["文字列", { count: "2" }],
    ["count なし", {}],
    ["JSON でない", "count=1"],
  ])("count が 1〜5 の整数でなければ 400（%s）", async (_, body) => {
    getActor.mockResolvedValue(member);
    expect((await POST(request(body), undefined)).status).toBe(400);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each<Actor>([member, { role: "admin", email: "admin@example.com" }])(
    "$role は count 枚ぶんの URL を、元の画像とサムネイルの両方に発行する",
    async (actor) => {
      getActor.mockResolvedValue(actor);
      const response = await POST(request({ count: 3 }), undefined);
      expect(response.status).toBe(200);

      const { items } = PhotoUploadUrls.parse(await response.json());
      expect(items).toHaveLength(3);
      expect(from).toHaveBeenCalledWith("photos");
      expect(createSignedUploadUrl).toHaveBeenCalledTimes(6);
      // upsert を付けない（すでにあるファイルを上書きさせない）
      for (const [, options] of createSignedUploadUrl.mock.calls) {
        expect(options?.upsert).not.toBe(true);
      }

      for (const item of items) {
        // 拾得物の登録の写真の検証を、そのまま通る
        expect(
          FoundItemPhotoInput.safeParse({
            path: item.path,
            thumbPath: item.thumbPath,
          }).success,
        ).toBe(true);
        expect(item.path).toMatch(/^found\/[0-9a-f-]{36}$/);
        expect(item.thumbPath).toBe(`${item.path}_thumb`);
        expect(item.uploadUrl).toContain(item.path);
        expect(item.thumbUploadUrl).toContain(item.thumbPath);
      }
      // 写真ごとに別のパス
      const paths = items.flatMap((item) => [item.path, item.thumbPath]);
      expect(new Set(paths).size).toBe(paths.length);
    },
  );

  it("Storage がエラーを返したら 500", async () => {
    getActor.mockResolvedValue(member);
    createSignedUploadUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("storage down"),
    } as never);
    expect((await POST(request({ count: 1 }), undefined)).status).toBe(500);
  });
});
