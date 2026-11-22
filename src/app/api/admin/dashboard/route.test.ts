import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbidden, unauthorized } from "@/lib/api/errors";

const { requireAdminMock, getDbMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getDbMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/db", () => ({
  getDb: getDbMock,
}));

import { GET } from "./route";

const ctx = { params: Promise.resolve({}) };

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未ログイン（401）を返す", async () => {
    requireAdminMock.mockRejectedValueOnce(unauthorized());

    const res = await GET(
      new Request("http://localhost/api/admin/dashboard"),
      ctx,
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "ログインしてください",
      },
    });
  });

  it("admin 以外は 403 を返す", async () => {
    requireAdminMock.mockRejectedValueOnce(forbidden("管理者権限が必要です"));

    const res = await GET(
      new Request("http://localhost/api/admin/dashboard"),
      ctx,
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "管理者権限が必要です",
      },
    });
  });

  it("admin でダッシュボードの 6 項目を返す", async () => {
    requireAdminMock.mockResolvedValueOnce({ role: "admin" });

    // route.ts の Promise.all の呼び出し順に合わせたモック戻り値
    const rowsByCall: Array<Array<Record<string, number>>> = [
      [{ foundItemCount: 12 }],
      [{ lostReportCount: 5 }],
      [{ resolvedCount: 4 }],
      [{ foundItemsLastHour: 3 }],
      [{ lostReportsLastHour: 1 }],
      [{ awaitingReplyCount: 2 }],
    ];
    let idx = 0;

    const createSelectChain = () => {
      const rows = rowsByCall[idx++] ?? [{}];
      return {
        where: vi.fn(() => Promise.resolve(rows)),
        then: (
          resolve: (value: Array<Record<string, number>>) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(rows).then(resolve, reject),
      };
    };

    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => createSelectChain()),
      })),
      selectDistinctOn: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            as: vi.fn(() => "latest_messages_subquery"),
          })),
        })),
      })),
    };

    getDbMock.mockReturnValue(db);

    const res = await GET(
      new Request("http://localhost/api/admin/dashboard?unused=1"),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      foundItemCount: 12,
      lostReportCount: 5,
      awaitingReplyCount: 2,
      resolvedCount: 4,
      foundItemsLastHour: 3,
      lostReportsLastHour: 1,
    });
  });
});
