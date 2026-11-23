import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { PATCH } from "./route";

// 権限・入力の誤り（手で変えられないステータスを含む）は DB の前で止まることを確かめる
// （CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const FOUND_ITEM_ID = "11111111-1111-4111-8111-111111111111";

function call(id: string, body: unknown) {
  const request = new Request(`http://localhost/api/found-items/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

function asAdmin() {
  vi.mocked(requireAdmin).mockResolvedValue({
    role: "admin",
    email: "admin@example.com",
  });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("PATCH /api/found-items/[id]/status", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(FOUND_ITEM_ID, { status: "disposed" });
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["拾得物の ID が uuid でない", "abc", { status: "disposed" }],
    ["status がない", FOUND_ITEM_ID, {}],
    ["status が enum にない", FOUND_ITEM_ID, { status: "lost" }],
    [
      "status が照合中（手で変えられない）",
      FOUND_ITEM_ID,
      { status: "matching" },
    ],
    [
      "status が受け渡し待ち（手で変えられない）",
      FOUND_ITEM_ID,
      { status: "awaiting_handover" },
    ],
    [
      "status が解決済み（手で変えられない）",
      FOUND_ITEM_ID,
      { status: "resolved" },
    ],
  ])("%s なら 400 にする", async (_, id, body) => {
    asAdmin();
    const res = await call(id, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });
});
