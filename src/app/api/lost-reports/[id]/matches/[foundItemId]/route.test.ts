import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { DELETE } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const FOUND_ITEM_ID = "11111111-1111-4111-8111-111111111111";

function call(id: string, foundItemId: string) {
  const request = new Request(
    `http://localhost/api/lost-reports/${id}/matches/${foundItemId}`,
    { method: "DELETE" },
  );
  return DELETE(request, { params: Promise.resolve({ id, foundItemId }) });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("DELETE /api/lost-reports/[id]/matches/[foundItemId]", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(REPORT_ID, FOUND_ITEM_ID);
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["申請の ID が uuid でない", "abc", FOUND_ITEM_ID],
    ["拾得物の ID が uuid でない", REPORT_ID, "1"],
  ])("%s なら 400 にする", async (_, id, foundItemId) => {
    vi.mocked(requireAdmin).mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    const res = await call(id, foundItemId);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });
});
