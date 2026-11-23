import { beforeEach, describe, expect, it, vi } from "vitest";
import { FOUND_STATUSES, ITEM_COLORS } from "@/db/enums";
import { forbidden, unauthorized } from "@/lib/api/errors";

const mockRequireAdmin = vi.fn();
const mockFindFirstLostReport = vi.fn();
const mockFindManyFoundItems = vi.fn();
const mockSignPhotoUrls = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock("@/db", () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

vi.mock("@/lib/storage/photos", () => ({
  signPhotoUrls: (...args: unknown[]) => mockSignPhotoUrls(...args),
}));

import { GET } from "./route";

// 権限と入力の誤りは DB の前で止まることを確かめる。カテゴリ・status・論理削除での絞り込みと、
// foundAt の近い順の並びは DB を使うので、テストではなく curl で確かめる（CI に DB がないため）

const VALID_ID = "22222222-2222-4222-8222-222222222222";

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/lost-reports/{id}/candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockReturnValue({
      query: {
        lostReports: {
          findFirst: (...args: unknown[]) => mockFindFirstLostReport(...args),
        },
        foundItems: {
          findMany: (...args: unknown[]) => mockFindManyFoundItems(...args),
        },
      },
    });
    mockRequireAdmin.mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    mockFindFirstLostReport.mockResolvedValue({
      id: VALID_ID,
      categoryId: 6,
      lostAt: new Date("2026-09-19T04:00:00.000Z"),
    });
    mockFindManyFoundItems.mockResolvedValue([]);
    // 本物と同じく、署名を頼んだパスにだけ URL を返す
    mockSignPhotoUrls.mockImplementation(async (paths: string[]) => {
      return (path: string) =>
        paths.includes(path) ? `https://example.com/${path}` : "";
    });
  });

  // 1. 権限のテスト（未ログインは 401、admin 以外（member / guest）は 403）
  it.each([
    [unauthorized(), 401],
    [forbidden(), 403],
  ])("admin でなければ DB に触らない（%#）", async (error, status) => {
    mockRequireAdmin.mockRejectedValueOnce(error);
    const res = await GET(
      new Request(`http://localhost/api/lost-reports/${VALID_ID}/candidates`),
      makeCtx(VALID_ID),
    );
    expect(res.status).toBe(status);
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  // 2. 入力の誤りのテスト
  it("id が UUID でない場合は 400 を返す", async () => {
    const res = await GET(
      new Request("http://localhost/api/lost-reports/not-a-uuid/candidates"),
      makeCtx("not-a-uuid"),
    );
    expect(res.status).toBe(400);
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  // 3. 存在しない申請のテスト
  it("対象の遺失物申請が存在しない場合は 404 を返す", async () => {
    mockFindFirstLostReport.mockResolvedValueOnce(undefined);
    const res = await GET(
      new Request(`http://localhost/api/lost-reports/${VALID_ID}/candidates`),
      makeCtx(VALID_ID),
    );
    expect(res.status).toBe(404);
  });

  // 4. 返す形のテスト（DB から取った行を FoundItem の形にする。絞り込みと並び順は curl で確かめる）
  it("取った行を FoundItem の形にして返す（写真はサムネイルだけ署名する）", async () => {
    mockFindManyFoundItems.mockResolvedValueOnce([
      {
        id: "11111111-1111-4111-8111-111111111111",
        number: 42,
        categoryId: 6,
        color: ITEM_COLORS[0],
        brand: "Sony",
        foundPlace: "講義棟 101",
        foundAt: new Date("2026-09-19T04:15:00.000Z"),
        isValuable: true,
        memo: "ケース付き",
        status: FOUND_STATUSES[0],
        registeredByEmail: "member@example.com",
        disposedAt: null,
        disposalNote: null,
        createdAt: new Date("2026-09-19T04:20:00.000Z"),
        updatedAt: new Date("2026-09-19T04:20:00.000Z"),
        deletedAt: null,
        category: { id: 6, name: "電気製品類" },
        photos: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            storagePath: "found/42/full.jpg",
            thumbPath: "found/42/thumb.jpg",
          },
        ],
        matches: [],
        handovers: [],
      },
    ]);

    const res = await GET(
      new Request(`http://localhost/api/lost-reports/${VALID_ID}/candidates`),
      makeCtx(VALID_ID),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      displayNumber: "拾-00042",
      status: FOUND_STATUSES[0],
      canEdit: true,
      photos: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          url: "",
          thumbUrl: "https://example.com/found/42/thumb.jpg",
        },
      ],
    });
    expect(mockSignPhotoUrls).toHaveBeenCalledWith(["found/42/thumb.jpg"]);
  });
});
