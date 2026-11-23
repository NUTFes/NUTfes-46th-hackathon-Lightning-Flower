import { beforeEach, describe, expect, it, vi } from "vitest";
import { ITEM_COLORS, LOST_STATUSES } from "@/db/enums";
import { forbidden, unauthorized } from "@/lib/api/errors";

const mockRequireAdmin = vi.fn();
const mockFindMany = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    query: {
      lostReports: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => mockWhere(...args),
      }),
    }),
  }),
}));

import { GET } from "./route";

describe("GET /api/lost-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    mockFindMany.mockResolvedValue([]);
    mockWhere.mockResolvedValue([{ total: 0 }]);
  });

  // 1. 権限のテスト
  it("未ログインは 401 を返す", async () => {
    mockRequireAdmin.mockRejectedValueOnce(unauthorized());
    const res = await GET(
      new Request("http://localhost/api/lost-reports"),
      undefined,
    );
    expect(res.status).toBe(401);
  });

  it("admin 以外（member / guest）は 403 を返す", async () => {
    mockRequireAdmin.mockRejectedValueOnce(forbidden());
    const res = await GET(
      new Request("http://localhost/api/lost-reports"),
      undefined,
    );
    expect(res.status).toBe(403);
  });

  // 2. 入力の誤りのテスト
  it("不正な status や範囲外の categoryId・awaitingReply は 400 を返す", async () => {
    const res1 = await GET(
      new Request("http://localhost/api/lost-reports?status=invalid_status"),
      undefined,
    );
    expect(res1.status).toBe(400);

    const res2 = await GET(
      new Request("http://localhost/api/lost-reports?categoryId=99999"),
      undefined,
    );
    expect(res2.status).toBe(400);

    const res3 = await GET(
      new Request("http://localhost/api/lost-reports?awaitingReply=yes"),
      undefined,
    );
    expect(res3.status).toBe(400);
  });

  it("page が 100000 を超えれば 400 を返し、DB に送らない", async () => {
    const res = await GET(
      new Request("http://localhost/api/lost-reports?page=100001&limit=100"),
      undefined,
    );
    expect(res.status).toBe(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  // 3. 正常系のテスト
  it("admin でクエリを指定して一覧と総件数を取得できる", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "22222222-2222-4222-8222-222222222222",
        number: 118,
        guestId: "44444444-4444-4444-8444-444444444444",
        categoryId: 6,
        color: ITEM_COLORS[0],
        brand: "Sony",
        lostPlace: "屋外ステージ周辺",
        lostAt: new Date("2026-09-19T04:00:00.000Z"),
        note: "紺色のイヤホン",
        status: LOST_STATUSES[0],
        verifiedAt: null,
        pickupMethod: null,
        pickupNote: null,
        cancelReason: null,
        cancelNote: null,
        cancelledAt: null,
        createdAt: new Date("2026-09-19T04:40:00.000Z"),
        updatedAt: new Date("2026-09-19T04:40:00.000Z"),
        category: { id: 6, name: "電気製品類" },
        guest: { email: "guest@example.com", displayName: "参加者" },
        matches: [],
        messages: [{ senderRole: "guest" }],
      },
    ]);
    mockWhere.mockResolvedValueOnce([{ total: 1 }]);

    const statuses = LOST_STATUSES.slice(0, 2).join(",");
    const res = await GET(
      new Request(
        `http://localhost/api/lost-reports?q=申-00118&status=${statuses}&categoryId=6&awaitingReply=true&page=1&limit=20`,
      ),
      undefined,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      displayNumber: "申-00118",
      awaitingReply: true,
      guest: { email: "guest@example.com", displayName: "参加者" },
    });
  });
});
