import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_COOKIE } from "@/lib/auth/login";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  recordConsent: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet, delete: mocks.cookieDelete }),
}));
vi.mock("@/db", () => ({ getDb: () => "db" }));
vi.mock("@/lib/auth/consent", () => ({ recordConsent: mocks.recordConsent }));

const { GET } = await import("./route");

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "guest@example.com",
  user_metadata: { full_name: "技大 太郎" },
};

function call(query: string) {
  return GET(new NextRequest(`http://localhost:3000/auth/callback?${query}`));
}

beforeEach(() => {
  mocks.exchangeCodeForSession
    .mockReset()
    .mockResolvedValue({ data: { user }, error: null });
  mocks.cookieGet.mockReset().mockReturnValue(undefined);
  mocks.cookieDelete.mockReset();
  mocks.recordConsent.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /auth/callback", () => {
  it("code をセッションに替えて next へ移る", async () => {
    const res = await call("code=abc&next=%2Flost-reports%2Fnew");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/lost-reports/new",
    );
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example"])(
    "next が外のサイト（%s）なら /home へ移る",
    async (next) => {
      const res = await call(`code=abc&next=${encodeURIComponent(next)}`);
      expect(res.headers.get("location")).toBe("http://localhost:3000/home");
    },
  );

  it("code がない（Google でキャンセルした）ならトップに戻す", async () => {
    const res = await call("error=access_denied");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=login",
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("code を替えられなければ（期限切れ・使用済み）トップに戻し、同意も記録しない", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("invalid grant"),
    });
    mocks.cookieGet.mockReturnValue({ value: "1" });
    const res = await call("code=abc");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=login",
    );
    expect(mocks.recordConsent).not.toHaveBeenCalled();
  });

  it("同意の Cookie があれば、ログインした本人として記録して Cookie を消す", async () => {
    mocks.cookieGet.mockImplementation((name: string) =>
      name === CONSENT_COOKIE ? { value: "1" } : undefined,
    );
    await call("code=abc");
    expect(mocks.recordConsent).toHaveBeenCalledWith("db", {
      id: user.id,
      email: user.email,
      name: "技大 太郎",
    });
    expect(mocks.cookieDelete).toHaveBeenCalledWith({
      name: CONSENT_COOKIE,
      path: "/auth",
    });
  });

  it("同意の Cookie がなければ記録しない", async () => {
    await call("code=abc");
    expect(mocks.recordConsent).not.toHaveBeenCalled();
  });

  it("同意を記録できなくても、ログインは済ませて next へ移る", async () => {
    mocks.cookieGet.mockReturnValue({ value: "1" });
    mocks.recordConsent.mockRejectedValue(new Error("db down"));
    const res = await call("code=abc&next=%2Fhome");
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });
});
