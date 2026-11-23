import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/lib/auth/actor";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI には DB がないので、DB を使ったら失敗させる）
const getActor = vi.hoisted(() => vi.fn<() => Promise<Actor | null>>());
vi.mock("@/lib/auth/actor", () => ({ getActor }));
vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("DB を使った");
  },
}));

const id = "22222222-2222-4222-8222-222222222222";
const post = (body: unknown, path = id) =>
  POST(
    new Request(`http://localhost/api/lost-reports/${path}/cancel`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: path }) },
  );

const guest: Actor = { role: "guest", id, email: "guest@example.com" };
const member: Actor = { role: "member", email: "member@example.com" };
const admin: Actor = { role: "admin", email: "admin@example.com" };

beforeEach(() => getActor.mockReset());

describe("POST /api/lost-reports/{id}/cancel", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await post({ reason: "found_myself" })).status).toBe(401);
  });

  it.each([member, admin])("guest でなければ 403（$role）", async (actor) => {
    getActor.mockResolvedValue(actor);
    expect((await post({ reason: "found_myself" })).status).toBe(403);
  });

  it.each([
    ["ID が uuid でない", { reason: "found_myself" }, "abc"],
    ["reason がない", {}, id],
    ["reason が決めた値でない", { reason: "lost_again" }, id],
    ["note が空白だけ", { reason: "other", note: " " }, id],
    ["本文が JSON でない", "found_myself", id],
  ])("%s なら 400", async (_, body, path) => {
    getActor.mockResolvedValue(guest);
    const res = await post(body, path);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
