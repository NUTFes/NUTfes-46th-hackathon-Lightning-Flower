import { describe, expect, it } from "vitest";
import { LostReport, LostReportForAdmin } from "@/lib/schemas/lost-report";
import {
  type LostReportForAdminRow,
  type LostReportRow,
  toLostReport,
  toLostReportForAdmin,
} from "./lost-report";

function row(overrides: Partial<LostReportRow> = {}): LostReportRow {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    number: 118,
    guestId: "44444444-4444-4444-8444-444444444444",
    categoryId: 6,
    color: "navy",
    brand: null,
    lostPlace: "屋外ステージ周辺",
    lostAt: new Date("2026-09-19T04:00:00.000Z"),
    note: null,
    status: "searching",
    verifiedAt: null,
    pickupMethod: null,
    pickupNote: null,
    cancelReason: null,
    cancelNote: null,
    cancelledAt: null,
    createdAt: new Date("2026-09-19T04:40:00.000Z"),
    updatedAt: new Date("2026-09-19T04:40:00.000Z"),
    category: { id: 6, name: "電気製品類" },
    ...overrides,
  };
}

function adminRow(
  overrides: Partial<LostReportForAdminRow> = {},
): LostReportForAdminRow {
  return {
    ...row(),
    guest: { email: "guest@example.com", displayName: "参加者" },
    matches: [],
    messages: [],
    ...overrides,
  };
}

describe("toLostReport", () => {
  it("API の LostReport の形にする", () => {
    const report = toLostReport(row());
    expect(LostReport.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      displayNumber: "申-00118",
      verified: false,
      pickup: null,
      cancel: null,
    });
  });

  it("guest に返す形には admin 用の項目を入れない", () => {
    expect(Object.keys(toLostReport(adminRow()))).not.toContain("guest");
    expect(Object.keys(toLostReport(adminRow()))).not.toContain("activeMatch");
  });

  it("本人確認・受け取り方法・取り消しを組み立てる", () => {
    const report = toLostReport(
      row({
        verifiedAt: new Date("2026-09-19T05:00:00.000Z"),
        pickupMethod: "other",
        pickupNote: "明日の朝",
        cancelReason: "found_myself",
        cancelNote: null,
        cancelledAt: new Date("2026-09-19T06:00:00.000Z"),
      }),
    );
    expect(report.verified).toBe(true);
    expect(report.pickup).toEqual({ method: "other", note: "明日の朝" });
    expect(report.cancel).toEqual({
      reason: "found_myself",
      note: null,
      cancelledAt: "2026-09-19T06:00:00.000Z",
    });
  });
});

describe("toLostReportForAdmin", () => {
  it("guest・activeMatch・awaitingReply を足す", () => {
    const report = toLostReportForAdmin(
      adminRow({
        matches: [
          {
            foundItem: {
              id: "11111111-1111-4111-8111-111111111111",
              number: 42,
            },
          },
        ],
        messages: [{ senderRole: "guest" }],
      }),
    );
    expect(LostReportForAdmin.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      guest: { email: "guest@example.com", displayName: "参加者" },
      activeMatch: {
        foundItemId: "11111111-1111-4111-8111-111111111111",
        displayNumber: "拾-00042",
      },
      awaitingReply: true,
    });
  });

  it("最新のメッセージが admin のものか、メッセージがなければ返信待ちではない", () => {
    expect(
      toLostReportForAdmin(adminRow({ messages: [{ senderRole: "admin" }] }))
        .awaitingReply,
    ).toBe(false);
    expect(toLostReportForAdmin(adminRow()).awaitingReply).toBe(false);
    expect(toLostReportForAdmin(adminRow()).activeMatch).toBeNull();
  });
});
