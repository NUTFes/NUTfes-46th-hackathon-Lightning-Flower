import type { SQL } from "drizzle-orm";
import { PgDialect, QueryBuilder } from "drizzle-orm/pg-core";
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
    color: row.color,
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
    // 削除の WHERE の副問い合わせ（NOT EXISTS）を SQL に組み立てられるよう、本物の QueryBuilder を使う
    select: (fields: Parameters<QueryBuilder["select"]>[0]) =>
      new QueryBuilder().select(fields),
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
      color: "black",
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
      color: "black",
      registeredByEmail: "other@example.com",
    });

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: "blue" }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(403);
  });

  it("入力の誤り：存在しない categoryId は 400 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      color: "black",
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
        color: "black",
        registeredByEmail: "member@example.com",
      })
      .mockResolvedValueOnce({
        id: VALID_ID,
        status: "received",
        color: "blue",
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
      body: JSON.stringify({ color: "blue" }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ color: "blue" });
  });

  // photos の差し替えのトランザクション。usedPhotos はほかの拾得物が使っている写真の行
  function mockPhotoTransaction(usedPhotos: { id: string }[]) {
    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      color: "black",
      registeredByEmail: "member@example.com",
    });
    mockTransaction.mockImplementation(async (cb) => {
      await cb({
        update: () => ({
          set: () => ({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        select: () => ({
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue(usedPhotos),
            }),
          }),
        }),
        delete: () => ({
          where: mockDeleteWhere,
        }),
        insert: () => ({
          values: mockInsertValues,
        }),
      });
    });
    return { mockInsertValues, mockDeleteWhere };
  }

  const photosRequest = () =>
    new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photos: [
          {
            path: "found/replaced.jpg",
            thumbPath: "found/replaced_thumb.jpg",
          },
        ],
      }),
    });

  it("正常：photos を差し替えて 200 を返す", async () => {
    const { mockInsertValues } = mockPhotoTransaction([]);

    const res = await PATCH(photosRequest(), makeContext());

    expect(res.status).toBe(200);
    expect(mockInsertValues).toHaveBeenCalledWith([
      {
        foundItemId: VALID_ID,
        storagePath: "found/replaced.jpg",
        thumbPath: "found/replaced_thumb.jpg",
        sortOrder: 0,
      },
    ]);
  });

  it("入力：ほかの拾得物が使っている写真のパスなら 400 で、写真を変えない", async () => {
    const { mockInsertValues, mockDeleteWhere } = mockPhotoTransaction([
      { id: "33333333-3333-4333-8333-333333333333" },
    ]);

    const res = await PATCH(photosRequest(), makeContext());

    expect(res.status).toBe(400);
    expect(mockDeleteWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/found-items/[id]", () => {
  // 削除の UPDATE。returned は RETURNING で返る行（0 行なら []）。WHERE に渡された条件を返す
  function mockDeleteUpdate(returned: { id: string }[]) {
    const mockWhere = vi.fn(() => ({
      returning: vi.fn().mockResolvedValue(returned),
    }));
    const mockSet = vi.fn(() => ({ where: mockWhere }));
    mockUpdate.mockReturnValue({ set: mockSet });
    return { mockSet, mockWhere };
  }

  const deleteRequest = (id = VALID_ID) =>
    new Request(`http://localhost/api/found-items/${id}`, {
      method: "DELETE",
    });

  it("入力の誤り：UUID 形式でなければ 400 を返し、更新しない", async () => {
    const res = await DELETE(
      deleteRequest("not-a-uuid"),
      makeContext("not-a-uuid"),
    );

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("権限：他人の登録を member が削除しようとすると 403 を返し、更新しない", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      registeredByEmail: "other@example.com",
    });

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("権限：admin は他人の登録も削除できる", async () => {
    mockRequireStaff.mockResolvedValue({
      role: "admin",
      email: "admin@example.com",
    });
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      registeredByEmail: "other@example.com",
    });
    mockDeleteUpdate([{ id: VALID_ID }]);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(204);
  });

  it("見つからない／削除済み：404 を返し、更新しない", async () => {
    mockFindFirstFoundItem.mockResolvedValue(undefined);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("正常：received の自分の登録を論理削除して 204 を返す。UPDATE の WHERE に received と、有効な紐づけがないことを入れる", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      registeredByEmail: "member@example.com",
    });
    const { mockSet, mockWhere } = mockDeleteUpdate([{ id: VALID_ID }]);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(204);
    expect(mockSet).toHaveBeenCalledWith({ deletedAt: expect.any(Date) });
    const where = new PgDialect().sqlToQuery(
      (mockWhere.mock.calls[0] as unknown as [SQL])[0],
    );
    expect(where.sql).toContain('"deleted_at" is null');
    expect(where.sql).toContain('"status" = $');
    expect(where.sql).toContain('not exists (select "id" from "matches"');
    expect(where.sql).toContain('"matches"."released_at" is null');
    expect(where.params).toEqual([VALID_ID, "received"]);
  });

  it("ステータス：received 以外は 409 を返す", async () => {
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "matching",
      registeredByEmail: "member@example.com",
    });
    mockDeleteUpdate([]);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        message:
          "保管中（received）で、申請と紐づいていない拾得物だけ削除できます",
      },
    });
  });

  it("同時の操作（#49）：読んだときは received でも、UPDATE までに紐づけなどで状態が変わって 0 行なら 409 を返す", async () => {
    // 1 回目は権限を確かめるための読み取り（received）、2 回目は 0 行のあとの行があるかの確かめ
    mockFindFirstFoundItem
      .mockResolvedValueOnce({
        id: VALID_ID,
        status: "received",
        registeredByEmail: "member@example.com",
      })
      .mockResolvedValueOnce({ id: VALID_ID });
    mockDeleteUpdate([]);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(409);
  });

  it("同時の操作：読んだあと、UPDATE までにほかの人が削除して 0 行なら 404 を返す", async () => {
    mockFindFirstFoundItem
      .mockResolvedValueOnce({
        id: VALID_ID,
        status: "received",
        registeredByEmail: "member@example.com",
      })
      .mockResolvedValueOnce(undefined);
    mockDeleteUpdate([]);

    const res = await DELETE(deleteRequest(), makeContext());

    expect(res.status).toBe(404);
  });
});
