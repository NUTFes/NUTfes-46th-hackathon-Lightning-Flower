import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { GET } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI には DB がないので、DB を使ったら失敗させる）
const getActor = vi.hoisted(() => vi.fn<() => Promise<Actor | null>>());
vi.mock("@/lib/auth/actor", () => ({ getActor }));
vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("DB を使った");
  },
}));

const request = (query = "") =>
  new Request(`http://localhost/api/chats${query}`);

beforeEach(() => getActor.mockReset());

describe("GET /api/chats", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await GET(request(), undefined)).status).toBe(401);
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
    expect((await GET(request(), undefined)).status).toBe(403);
  });

  it("awaitingReply が true / false でなければ 400", async () => {
    getActor.mockResolvedValue({ role: "admin", email: "admin@example.com" });
    expect((await GET(request("?awaitingReply=1"), undefined)).status).toBe(
      400,
    );
  });

  it("limit が 1〜100 でなければ 400", async () => {
    getActor.mockResolvedValue({ role: "admin", email: "admin@example.com" });
    expect((await GET(request("?limit=101"), undefined)).status).toBe(400);
  });
});
