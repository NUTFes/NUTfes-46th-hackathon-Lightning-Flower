import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_COOKIE } from "@/lib/auth/login";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithOAuth: mocks.signInWithOAuth },
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet, delete: mocks.cookieDelete }),
}));

const { GET } = await import("./route");

const GOOGLE_URL = "https://accounts.google.example/o/oauth2/auth?x=1";

function call(query: string, headers: Record<string, string> = {}) {
  return GET(
    new NextRequest(`http://localhost:3000/auth/login?${query}`, { headers }),
  );
}

beforeEach(() => {
  mocks.signInWithOAuth
    .mockReset()
    .mockResolvedValue({ data: { url: GOOGLE_URL }, error: null });
  mocks.cookieSet.mockReset();
  mocks.cookieDelete.mockReset();
});

describe("GET /auth/login", () => {
  it("Google の画面へ移り、戻り先は同じオリジンの /auth/callback にする", async () => {
    const res = await call("provider=google&next=/lost-reports/new");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(GOOGLE_URL);
    const { options } = mocks.signInWithOAuth.mock.calls[0][0];
    expect(options.redirectTo).toBe(
      "http://localhost:3000/auth/callback?next=%2Flost-reports%2Fnew",
    );
  });

  it.each(["https://evil.example/", "//evil.example/", "/\\evil.example"])(
    "next が外のサイト（%s）なら /home に戻す",
    async (next) => {
      await call(`provider=google&next=${encodeURIComponent(next)}`);
      const { options } = mocks.signInWithOAuth.mock.calls[0][0];
      expect(new URL(options.redirectTo).searchParams.get("next")).toBe(
        "/home",
      );
    },
  );

  it.each([[""], ["provider=github"], ["provider="]])(
    "知らないプロバイダー（%s）ならトップに戻す",
    async (query) => {
      const res = await call(query);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/?error=login",
      );
      expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
    },
  );

  it("OAuth を始められなければトップに戻す", async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("provider is not enabled"),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call("provider=google");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=login",
    );
  });

  it("このサイトの画面から consent=1 で来たら、同意の Cookie を書く", async () => {
    await call("provider=google&consent=1", {
      "sec-fetch-site": "same-origin",
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      CONSENT_COOKIE,
      "1",
      expect.objectContaining({ httpOnly: true, path: "/auth" }),
    );
  });

  it.each([["cross-site"], ["same-site"], ["none"], [undefined]])(
    "ほかのサイトのリンクなど（Sec-Fetch-Site: %s）からの consent=1 は受け取らない",
    async (site) => {
      await call(
        "provider=google&consent=1",
        site ? { "sec-fetch-site": site } : {},
      );
      expect(mocks.cookieSet).not.toHaveBeenCalled();
      expect(mocks.cookieDelete).toHaveBeenCalledWith({
        name: CONSENT_COOKIE,
        path: "/auth",
      });
    },
  );

  it("consent がなければ、前に残った同意の Cookie を消す", async () => {
    await call("provider=google", { "sec-fetch-site": "same-origin" });
    expect(mocks.cookieSet).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).toHaveBeenCalled();
  });
});
