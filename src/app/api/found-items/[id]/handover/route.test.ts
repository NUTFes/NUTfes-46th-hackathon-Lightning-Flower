import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まり、本文なし・古い形の本文は DB に進むことを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const FOUND_ITEM_ID = "11111111-1111-4111-8111-111111111111";

// body は送る本文の文字列（undefined なら本文なし）
function call(id: string, body: string | undefined) {
  const request = new Request(
    `http://localhost/api/found-items/${id}/handover`,
    { method: "POST", body },
  );
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("POST /api/found-items/[id]/handover", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(FOUND_ITEM_ID, undefined);
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["拾得物の ID が uuid でない", "abc", undefined],
    ["本文が JSON でない", FOUND_ITEM_ID, "{"],
    ["本文がオブジェクトでない", FOUND_ITEM_ID, "[]"],
  ])("%s なら 400 にする", async (_, id, body) => {
    vi.mocked(requireAdmin).mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    const res = await call(id, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["本文なし", undefined],
    ["空のオブジェクト", "{}"],
    [
      "古い画面の本文（handedAt・receiverName）",
      JSON.stringify({ handedAt: "0000-01-01T00:00:00Z", receiverName: "  " }),
    ],
  ])("%s なら 400 にせず DB に進む", async (_, body) => {
    vi.mocked(requireAdmin).mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    // DB に進んだことだけを確かめる（transaction で止めて 500 にする）
    vi.mocked(getDb).mockReturnValue({
      transaction: vi.fn().mockRejectedValue(new Error("stop")),
    } as unknown as ReturnType<typeof getDb>);
    const res = await call(FOUND_ITEM_ID, body);
    expect(res.status).toBe(500);
    expect(getDb).toHaveBeenCalled();
  });
});
