import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getStaff: vi.fn(), getGuest: vi.fn() }));
vi.mock("./staff", () => ({ getStaff: mocks.getStaff }));
vi.mock("./guest", () => ({ getGuest: mocks.getGuest }));

const { getActor } = await import("./actor");

describe("getActor", () => {
  beforeEach(() => {
    mocks.getStaff.mockReset();
    mocks.getGuest.mockReset();
  });

  it("staff と guest の両方のログインがあれば、staff として扱う", async () => {
    mocks.getStaff.mockResolvedValue({
      email: "admin@example.com",
      role: "admin",
    });
    mocks.getGuest.mockResolvedValue({ id: "g1", email: "guest@example.com" });
    expect(await getActor(new Headers())).toEqual({
      kind: "staff",
      email: "admin@example.com",
      role: "admin",
    });
    expect(mocks.getGuest).not.toHaveBeenCalled();
  });

  it("staff でなければ guest を見る", async () => {
    mocks.getStaff.mockResolvedValue(null);
    mocks.getGuest.mockResolvedValue({ id: "g1", email: "guest@example.com" });
    expect(await getActor(new Headers())).toEqual({
      kind: "guest",
      role: "guest",
      id: "g1",
      email: "guest@example.com",
    });
  });

  it("どちらでもなければ null", async () => {
    mocks.getStaff.mockResolvedValue(null);
    mocks.getGuest.mockResolvedValue(null);
    expect(await getActor(new Headers())).toBeNull();
  });
});
