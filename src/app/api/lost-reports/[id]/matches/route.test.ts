import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const FOUND_ITEM_ID = "11111111-1111-4111-8111-111111111111";

function call(id: string, body: unknown) {
  const request = new Request(
    `http://localhost/api/lost-reports/${id}/matches`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("POST /api/lost-reports/[id]/matches", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(REPORT_ID, { foundItemId: FOUND_ITEM_ID });
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["申請の ID が uuid でない", "abc", { foundItemId: FOUND_ITEM_ID }],
    ["foundItemId がない", REPORT_ID, {}],
    ["foundItemId が uuid でない", REPORT_ID, { foundItemId: "1" }],
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
