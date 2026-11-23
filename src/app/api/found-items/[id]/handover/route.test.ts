import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const FOUND_ITEM_ID = "11111111-1111-4111-8111-111111111111";
const BODY = { handedAt: "2026-09-19T15:00:00+09:00", receiverName: "山田" };

function call(id: string, body: unknown) {
  const request = new Request(
    `http://localhost/api/found-items/${id}/handover`,
    { method: "POST", body: JSON.stringify(body) },
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
    const res = await call(FOUND_ITEM_ID, BODY);
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["拾得物の ID が uuid でない", "abc", BODY],
    ["handedAt がない", FOUND_ITEM_ID, { receiverName: "山田" }],
    [
      "handedAt にオフセットがない",
      FOUND_ITEM_ID,
      { ...BODY, handedAt: "2026-09-19T15:00:00" },
    ],
    ["receiverName がない", FOUND_ITEM_ID, { handedAt: BODY.handedAt }],
    ["receiverName が空白だけ", FOUND_ITEM_ID, { ...BODY, receiverName: "  " }],
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
});
