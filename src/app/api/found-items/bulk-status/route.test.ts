import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { POST } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる（CI に DB がないので、DB を使う正常系は curl で確かめる）
vi.mock("@/lib/api/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

const ID_1 = "11111111-1111-4111-8111-111111111111";
const ID_2 = "33333333-3333-4333-8333-333333333333";
const BODY = {
  foundItemIds: [ID_1, ID_2],
  status: "transferred_to_police",
  note: "預り書 No.123",
};

function call(body: unknown) {
  const request = new Request("http://localhost/api/found-items/bulk-status", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.mocked(requireAdmin).mockReset();
  vi.mocked(getDb).mockReset();
});

describe("POST /api/found-items/bulk-status", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    vi.mocked(requireAdmin).mockRejectedValue(error);
    const res = await call(BODY);
    expect(res.status).toBe(status);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each([
    ["foundItemIds が空", { ...BODY, foundItemIds: [] }],
    ["foundItemIds に uuid でないものがある", { ...BODY, foundItemIds: ["1"] }],
    ["foundItemIds が重複している", { ...BODY, foundItemIds: [ID_1, ID_1] }],
    ["status が received", { ...BODY, status: "received" }],
    ["status が resolved", { ...BODY, status: "resolved" }],
    ["note が空白だけ", { ...BODY, note: " " }],
  ])("%s なら 400 にする", async (_, body) => {
    vi.mocked(requireAdmin).mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    const res = await call(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(getDb).not.toHaveBeenCalled();
  });
});
