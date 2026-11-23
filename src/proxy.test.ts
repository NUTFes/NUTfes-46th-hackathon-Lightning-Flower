import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStaff: vi.fn(),
  updateGuestSession: vi.fn(),
}));
vi.mock("@/lib/auth/staff", () => ({ getStaff: mocks.getStaff }));
vi.mock("@/lib/supabase/proxy", () => ({
  updateGuestSession: mocks.updateGuestSession,
}));

const { proxy } = await import("./proxy");

function call(path: string) {
  return proxy(new NextRequest(`http://localhost:3000${path}`));
}

function guestSession(loggedIn: boolean) {
  const response = NextResponse.next();
  // 期限の切れたセッションを消すときの Cookie の例
  if (!loggedIn) response.cookies.set("sb-test-auth-token", "", { maxAge: 0 });
  mocks.updateGuestSession.mockResolvedValue({ response, loggedIn });
  return response;
}

beforeEach(() => {
  mocks.getStaff.mockReset().mockResolvedValue(null);
  mocks.updateGuestSession.mockReset();
});

describe("proxy：guest の画面", () => {
  it.each(["/home", "/lost-reports/new", "/lost-reports/abc/chat"])(
    "ログインしていなければ %s からトップへ戻し、戻る先を next に付ける",
    async (path) => {
      guestSession(false);
      const res = await call(`${path}?tab=1`);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/");
      expect(location.searchParams.get("next")).toBe(`${path}?tab=1`);
      // セッションを消す Cookie も、戻す応答に写す
      expect(res.cookies.get("sb-test-auth-token")?.value).toBe("");
    },
  );

  it("ログインしていれば、セッションを更新した応答をそのまま返す", async () => {
    const response = guestSession(true);
    expect(await call("/home")).toBe(response);
  });

  it.each(["/", "/privacy", "/terms", "/auth/callback", "/api/me", "/homes"])(
    "ログインの要らない %s は、ログインしていなくても通す",
    async (path) => {
      const response = guestSession(false);
      expect(await call(path)).toBe(response);
    },
  );

  it("guest の画面では staff を確かめない", async () => {
    guestSession(true);
    await call("/home");
    expect(mocks.getStaff).not.toHaveBeenCalled();
  });
});

describe("proxy：staff の画面", () => {
  it.each(["/staff", "/staff/found-items", "/admin", "/admin/settings"])(
    "%s は staff でなければ 401 にし、guest のセッションは見ない",
    async (path) => {
      const res = await call(path);
      expect(res.status).toBe(401);
      expect(mocks.updateGuestSession).not.toHaveBeenCalled();
    },
  );

  it("/admin は member なら 403", async () => {
    mocks.getStaff.mockResolvedValue({
      email: "m@example.com",
      role: "member",
    });
    expect((await call("/admin")).status).toBe(403);
  });

  it("/staff は member なら通す", async () => {
    mocks.getStaff.mockResolvedValue({
      email: "m@example.com",
      role: "member",
    });
    const res = await call("/staff");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
