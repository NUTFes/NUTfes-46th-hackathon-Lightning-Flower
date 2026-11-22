import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { GET, POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI には DB がないので、DB を使ったら失敗させる）
const getActor = vi.hoisted(() => vi.fn<() => Promise<Actor | null>>());
vi.mock("@/lib/auth/actor", () => ({ getActor }));
vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("DB を使った");
  },
}));

const id = "22222222-2222-4222-8222-222222222222";
const url = (path = id, query = "") =>
  `http://localhost/api/lost-reports/${path}/messages${query}`;
const ctx = (path = id) => ({ params: Promise.resolve({ id: path }) });
const post = (body: unknown, path = id) =>
  POST(
    new Request(url(path), { method: "POST", body: JSON.stringify(body) }),
    ctx(path),
  );

const guest: Actor = { role: "guest", id, email: "guest@example.com" };
const member: Actor = { role: "member", email: "member@example.com" };
const admin: Actor = { role: "admin", email: "admin@example.com" };

beforeEach(() => getActor.mockReset());

describe("GET /api/lost-reports/{id}/messages", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await GET(new Request(url()), ctx())).status).toBe(401);
  });

  it("member は 403", async () => {
    getActor.mockResolvedValue(member);
    expect((await GET(new Request(url()), ctx())).status).toBe(403);
  });

  it("id が uuid でなければ 400", async () => {
    getActor.mockResolvedValue(guest);
    expect((await GET(new Request(url("1")), ctx("1"))).status).toBe(400);
  });

  it("after が日時でなければ 400", async () => {
    getActor.mockResolvedValue(admin);
    const res = await GET(new Request(url(id, "?after=yesterday")), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toContain("after");
  });
});

describe("POST /api/lost-reports/{id}/messages", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await post({ body: "こんにちは" })).status).toBe(401);
  });

  it("member は 403", async () => {
    getActor.mockResolvedValue(member);
    expect((await post({ body: "こんにちは" })).status).toBe(403);
  });

  it.each([[{}], [{ body: "" }], [{ body: "あ".repeat(1001) }]])(
    "本文が合わなければ 400（%#）",
    async (body) => {
      getActor.mockResolvedValue(guest);
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error.message).toContain("body");
    },
  );
});
