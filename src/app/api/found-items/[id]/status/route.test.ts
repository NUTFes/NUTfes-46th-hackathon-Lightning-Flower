import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { PATCH } from "./route";

// 権限・入力の誤りと、手で変えられないステータスは DB の前で止まることを確かめる
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
  ])("%s なら 400 にする", async (_, id, body) => {
    asAdmin();
    const res = await call(id, body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each(["matching", "awaiting_handover", "resolved"])(
    "%s には手で変えられないので 409 にする",
    async (status) => {
      asAdmin();
      const res = await call(FOUND_ITEM_ID, { status });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("CONFLICT");
      expect(getDb).not.toHaveBeenCalled();
    },
  );
});
