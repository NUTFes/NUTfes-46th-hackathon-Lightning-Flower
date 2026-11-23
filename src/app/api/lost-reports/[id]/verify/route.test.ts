import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const REPORT_ID = "22222222-2222-4222-8222-222222222222";

function call(id: string) {
  const request = new Request(
    `http://localhost/api/lost-reports/${id}/verify`,
    { method: "POST" },
  );
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("POST /api/lost-reports/[id]/verify", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(REPORT_ID);
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it("申請の ID が uuid でなければ 400 にする", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    const res = await call("abc");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });
});
