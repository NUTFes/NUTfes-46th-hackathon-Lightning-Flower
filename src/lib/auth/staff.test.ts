import { afterEach, describe, expect, it, vi } from "vitest";
import { getStaff } from "./staff";

describe("getStaff", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("next dev では DEV_STAFF_EMAIL でログインしたことにする", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_STAFF_EMAIL", "member.local@example.com");
    expect(await getStaff(new Headers())).toEqual({
      email: "member.local@example.com",
      role: "member",
    });
  });

  it("本番では DEV_STAFF_EMAIL を使わない", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_STAFF_EMAIL", "member.local@example.com");
    expect(await getStaff(new Headers())).toBeNull();
  });

  it("Vercel では next dev でも DEV_STAFF_EMAIL を使わない", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("DEV_STAFF_EMAIL", "member.local@example.com");
    expect(await getStaff(new Headers())).toBeNull();
  });

  it("検証できない JWT は通さない", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Headers({ "cf-access-jwt-assertion": "not-a-jwt" });
    expect(await getStaff(headers)).toBeNull();
  });
});
