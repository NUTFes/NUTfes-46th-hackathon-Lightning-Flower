import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { requireGuest } from "@/lib/api/auth";
import { forbidden, unauthorized } from "@/lib/api/errors";
import { recordConsent } from "@/lib/auth/consent";
import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireGuest: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/auth/consent", () => ({ recordConsent: vi.fn() }));

const guest = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "guest@example.com",
  name: "技大 太郎",
};
const db = { fake: "db" };

function call(body?: string) {
  return POST(
    new Request("http://localhost/api/me/consent", { method: "POST", body }),
    undefined,
  );
}

beforeEach(() => {
  vi.mocked(requireGuest).mockReset();
  vi.mocked(getDb)
    .mockReset()
    .mockReturnValue(db as never);
  vi.mocked(recordConsent).mockReset().mockResolvedValue();
});

describe("POST /api/me/consent", () => {
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("guest でなければ記録しない（%#）", async (error, status) => {
    vi.mocked(requireGuest).mockRejectedValue(error);
    const res = await call();
    expect(res.status).toBe(status);
    expect(recordConsent).not.toHaveBeenCalled();
  });

  it("セッションの guest として記録し、GET /api/me と同じ形で返す", async () => {
    vi.mocked(requireGuest).mockResolvedValue(guest);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      role: "guest",
      email: guest.email,
      consented: true,
    });
    expect(recordConsent).toHaveBeenCalledWith(db, guest);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("本文に別の人の ID を入れても、セッションの guest として記録する", async () => {
    vi.mocked(requireGuest).mockResolvedValue(guest);
    const res = await call(
      JSON.stringify({ id: "22222222-2222-4222-8222-222222222222" }),
    );
    expect(res.status).toBe(200);
    expect(recordConsent).toHaveBeenCalledWith(db, guest);
  });

  it("Auth のユーザーが消えていれば、recordConsent の 401 をそのまま返す", async () => {
    vi.mocked(requireGuest).mockResolvedValue(guest);
    vi.mocked(recordConsent).mockRejectedValue(
      unauthorized("ログインし直してください"),
    );
    const res = await call();
    expect(res.status).toBe(401);
  });
});
