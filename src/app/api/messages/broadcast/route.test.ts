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

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/messages/broadcast", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    undefined,
  );

beforeEach(() => getActor.mockReset());

describe("POST /api/messages/broadcast", () => {
  it("ログインしていなければ 401", async () => {
    getActor.mockResolvedValue(null);
    expect((await post({ status: "searching", body: "お知らせ" })).status).toBe(
      401,
    );
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
    expect((await post({ status: "searching", body: "お知らせ" })).status).toBe(
      403,
    );
  });

  it.each([
    [{ body: "お知らせ" }],
    [
      {
        lostReportIds: ["22222222-2222-4222-8222-222222222222"],
        status: "searching",
        body: "お知らせ",
      },
    ],
    [{ status: "searching", body: "" }],
  ])("宛先・本文が合わなければ 400（%#）", async (body) => {
    getActor.mockResolvedValue({ role: "admin", email: "admin@example.com" });
    expect((await post(body)).status).toBe(400);
  });
});
