import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

const mockRequireStaff = vi.fn();
const mockFindFirstFoundItem = vi.fn();
const mockFindFirstCategory = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockSignPhotoUrls = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireStaff: (...args: unknown[]) => mockRequireStaff(...args),
}));

vi.mock("@/lib/storage/photos", () => ({
  signPhotoUrls: (...args: unknown[]) => mockSignPhotoUrls(...args),
}));

vi.mock("@/lib/serializers/found-item", () => ({
  photoPathsOf: vi.fn(() => []),
  toFoundItem: vi.fn((row) => ({
    id: row.id,
    status: row.status,
    features: row.features,
  })),
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    query: {
      foundItems: {
        findFirst: (...args: unknown[]) => mockFindFirstFoundItem(...args),
      },
      categories: {
        findFirst: (...args: unknown[]) => mockFindFirstCategory(...args),
      },
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  }),
}));

const VALID_ID = "11111111-1111-4111-8111-111111111111";

function makeContext(id = VALID_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireStaff.mockResolvedValue({
    role: "member",
    email: "member@example.com",
  });
  mockSignPhotoUrls.mockResolvedValue(new Map());
});

describe("GET /api/found-items/[id]", () => {
  it("正常：存在すれば 200 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      features: "黒い傘",
      registeredByEmail: "member@example.com",
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`);
    const res = await GET(req, makeContext());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ id: VALID_ID });
  });

  it("入力の誤り：UUID 形式でなければ 400 を返す", async () => {
    const req = new Request("http://localhost/api/found-items/not-a-uuid");
    const res = await GET(req, makeContext("not-a-uuid"));

    expect(res.status).toBe(400);
  });

  it("見つからない／削除済み：404 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue(undefined);

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`);
    const res = await GET(req, makeContext());

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/found-items/[id]", () => {
  it("権限：他人の登録を member が編集しようとすると 403 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      features: "黒い傘",
      registeredByEmail: "other@example.com",
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: "青い傘" }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(403);
  });

  it("入力の誤り：存在しない categoryId は 400 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      features: "黒い傘",
      registeredByEmail: "member@example.com",
    });
    mockFindFirstCategory.mockResolvedValue(undefined);

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: 999999 }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(400);
  });

  it("正常：自分の登録を編集して 200 を返す", async () => {
    mockFindFirstFoundItem
      .mockResolvedValueOnce({
        id: VALID_ID,
        status: "received",
        features: "黒い傘",
        registeredByEmail: "member@example.com",
      })
      .mockResolvedValueOnce({
        id: VALID_ID,
        status: "received",
        features: "青い傘",
        registeredByEmail: "member@example.com",
      });
    mockTransaction.mockImplementation(async (cb) => {
      await cb({
        update: () => ({
          set: () => ({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        delete: () => ({
          where: vi.fn().mockResolvedValue(undefined),
        }),
        insert: () => ({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: "青い傘" }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ features: "青い傘" });
  });
});

describe("DELETE /api/found-items/[id]", () => {
  it("権限：他人の登録を member が削除しようとすると 403 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      registeredByEmail: "other@example.com",
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, makeContext());

    expect(res.status).toBe(403);
  });

  it("ステータス：received 以外は 409 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "matching",
      registeredByEmail: "member@example.com",
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, makeContext());

    expect(res.status).toBe(409);
  });

  it("正常：received の自分の登録を論理削除して 204 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      registeredByEmail: "member@example.com",
    });
    mockUpdate.mockReturnValue({
      set: () => ({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, makeContext());

    expect(res.status).toBe(204);
  });
});
