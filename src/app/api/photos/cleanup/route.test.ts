import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { PhotoCleanupResult } from "@/lib/schemas/photo";
import { POST } from "./route";

const getActor = vi.hoisted(() => vi.fn<() => Promise<Actor | null>>());
const removeUnusedPhotoFiles = vi.hoisted(() => vi.fn(async () => 4));
vi.mock("@/lib/auth/actor", () => ({ getActor }));
vi.mock("@/lib/storage/photo-cleanup", () => ({ removeUnusedPhotoFiles }));

const post = () =>
  POST(
    new Request("http://localhost/api/photos/cleanup", { method: "POST" }),
    undefined,
  );

beforeEach(() => {
  getActor.mockReset();
  removeUnusedPhotoFiles.mockClear();
});

describe("POST /api/photos/cleanup", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
    expect(removeUnusedPhotoFiles).not.toHaveBeenCalled();
  });

  it.each<Actor>([
    {
      role: "guest",
      id: "22222222-2222-4222-8222-222222222222",
      email: "g@example.com",
    },
    { role: "member", email: "member@example.com" },
  ])("admin でなければ 403（$role）", async (actor) => {
    getActor.mockResolvedValue(actor);
    expect((await post()).status).toBe(403);
    expect(removeUnusedPhotoFiles).not.toHaveBeenCalled();
  });

  it("admin は消したファイルの数を受け取る", async () => {
    getActor.mockResolvedValue({ role: "admin", email: "admin@example.com" });
    const response = await post();
    expect(response.status).toBe(200);
    expect(PhotoCleanupResult.parse(await response.json())).toEqual({
      deleted: 4,
    });
    expect(removeUnusedPhotoFiles).toHaveBeenCalledTimes(1);
  });

  it("消すのに失敗したら 500", async () => {
    getActor.mockResolvedValue({ role: "admin", email: "admin@example.com" });
    removeUnusedPhotoFiles.mockRejectedValueOnce(new Error("storage down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post()).status).toBe(500);
  });
});
