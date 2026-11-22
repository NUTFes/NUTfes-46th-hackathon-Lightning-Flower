import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccessStaff: vi.fn(),
  getDevStaff: vi.fn(),
  getGuest: vi.fn(),
}));
vi.mock("./staff", () => ({
  getAccessStaff: mocks.getAccessStaff,
  getDevStaff: mocks.getDevStaff,
}));
vi.mock("./guest", () => ({ getGuest: mocks.getGuest }));

const { getActor } = await import("./actor");

const admin = { email: "admin@example.com", role: "admin" };
const devMember = { email: "member.local@example.com", role: "member" };
const guest = { id: "g1", email: "guest@example.com" };

describe("getActor", () => {
  beforeEach(() => {
    mocks.getAccessStaff.mockReset().mockResolvedValue(null);
    mocks.getDevStaff.mockReset().mockReturnValue(null);
    mocks.getGuest.mockReset().mockResolvedValue(null);
  });

  it("Cloudflare Access の staff と guest の両方があれば、staff として扱う", async () => {
    mocks.getAccessStaff.mockResolvedValue(admin);
    mocks.getGuest.mockResolvedValue(guest);
    expect(await getActor(new Headers())).toEqual(admin);
    expect(mocks.getGuest).not.toHaveBeenCalled();
  });

  it("staff でなければ guest を見る", async () => {
    mocks.getGuest.mockResolvedValue(guest);
    expect(await getActor(new Headers())).toEqual({ role: "guest", ...guest });
  });

  it("ローカルの DEV_STAFF_EMAIL より guest のログインを優先する（ローカルで guest を試せるように）", async () => {
    mocks.getDevStaff.mockReturnValue(devMember);
    mocks.getGuest.mockResolvedValue(guest);
    expect((await getActor(new Headers()))?.role).toBe("guest");
  });

  it("guest のログインがなければ、ローカルの DEV_STAFF_EMAIL を使う", async () => {
    mocks.getDevStaff.mockReturnValue(devMember);
    expect(await getActor(new Headers())).toEqual(devMember);
  });

  it("Access の JWT が付いているのに検証できなければ、guest の Cookie があっても guest にしない", async () => {
    mocks.getGuest.mockResolvedValue(guest);
    const headers = new Headers({ "cf-access-jwt-assertion": "broken" });
    expect(await getActor(headers)).toBeNull();
    expect(mocks.getGuest).not.toHaveBeenCalled();
  });

  it("どれでもなければ null", async () => {
    expect(await getActor(new Headers())).toBeNull();
  });
});
