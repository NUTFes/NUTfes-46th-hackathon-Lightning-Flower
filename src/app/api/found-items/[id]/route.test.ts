import type { SQL } from "drizzle-orm";
import { PgDialect, QueryBuilder } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tx } from "@/db";
import { replaceFoundItemPhotos } from "@/lib/queries/found-items";
import { DELETE, GET, PATCH } from "./route";

const mockRequireStaff = vi.fn();
const mockFindFirstFoundItem = vi.fn();
const mockFindFirstCategory = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockSignPhotoUrls = vi.fn();
const mockFindMissingPhotoFiles = vi.fn();
const mockRemovePhotoFilesIfUnused = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireStaff: (...args: unknown[]) => mockRequireStaff(...args),
}));

vi.mock("@/lib/storage/photos", () => ({
  signPhotoUrls: (...args: unknown[]) => mockSignPhotoUrls(...args),
  findMissingPhotoFiles: (...args: unknown[]) =>
    mockFindMissingPhotoFiles(...args),
}));

vi.mock("@/lib/storage/photo-cleanup", () => ({
  removePhotoFilesIfUnused: (...args: unknown[]) =>
    mockRemovePhotoFilesIfUnused(...args),
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

// WHERE などの条件を SQL にして、params で渡す値を確かめる
const toSql = (sql: SQL) => new PgDialect().sqlToQuery(sql);

// 写真を変えるトランザクションの tx.select()。where() のあとの使い方で返すものを変える：
// for("update") は拾得物のロック、limit() はほかの拾得物のパス（isPhotoPathUsed）、
// そのまま await したときは、呼んだ順に awaited の結果（今の写真 → 消したあともまだ使っている行）を返す
function mockSelect({
  lock,
  used,
  awaited,
}: {
  lock: () => Promise<unknown[]>;
  used: unknown[];
  awaited: unknown[][];
}) {
  const queue = [...awaited];
  return () => ({
    from: () => ({
      where: () => ({
        for: lock,
        limit: vi.fn().mockResolvedValue(used),
        then: (
          resolve: (value: unknown[]) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise.resolve(queue.shift() ?? []).then(resolve, reject),
      }),
    }),
  });
}

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
  mockFindMissingPhotoFiles.mockResolvedValue([]);
  mockRemovePhotoFilesIfUnused.mockResolvedValue(0);
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
    mockTransaction.mockImplementation(async (cb) =>
      cb({
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
      }),
    );

    const req = new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: "blue" }),
    });
    const res = await PATCH(req, makeContext());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ color: "blue" });
  });

  const PHOTO_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const PHOTO_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const PHOTO_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const OTHER_PHOTO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  const currentPhoto = (id: string, name: string, sortOrder = 0) => ({
    id,
    storagePath: `found/${name}.jpg`,
    thumbPath: `found/${name}_thumb.jpg`,
    sortOrder,
  });

  // 写真を変えるトランザクション。currentPhotos はこの拾得物の今の写真、
  // usedPhotos はほかの拾得物が使っている写真の行、locked は行のロックで拾得物が取れたか
  function mockPhotoTransaction({
    currentPhotos = [] as ReturnType<typeof currentPhoto>[],
    usedPhotos = [] as { id: string }[],
    locked = true,
  } = {}) {
    const mockInsertValues = vi.fn().mockResolvedValue(undefined);
    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    const mockSortOrderSet = vi.fn();
    const mockLock = vi
      .fn()
      .mockResolvedValue(locked ? [{ id: VALID_ID }] : []);
    mockFindFirstFoundItem.mockResolvedValue({
      id: VALID_ID,
      status: "received",
      color: "black",
      registeredByEmail: "member@example.com",
    });
    mockTransaction.mockImplementation(async (cb) =>
      cb({
        update: () => ({
          set: (values: unknown) => ({
            where: vi.fn(async (where: SQL) => {
              if (
                typeof values === "object" &&
                values !== null &&
                "sortOrder" in values
              ) {
                mockSortOrderSet(values, toSql(where).params);
              }
            }),
          }),
        }),
        select: mockSelect({
          lock: mockLock,
          used: usedPhotos,
          awaited: [currentPhotos, []],
        }),
        delete: () => ({
          where: mockDeleteWhere,
        }),
        insert: () => ({
          values: mockInsertValues,
        }),
      }),
    );
    return { mockInsertValues, mockDeleteWhere, mockSortOrderSet, mockLock };
  }

  const patchRequest = (body: unknown) =>
    new Request(`http://localhost/api/found-items/${VALID_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const newPhoto = {
    path: "found/replaced.jpg",
    thumbPath: "found/replaced_thumb.jpg",
  };

  it("正常：photos だけを送ったら、今の写真をすべて外して差し替える", async () => {
    const { mockInsertValues, mockDeleteWhere, mockSortOrderSet } =
      mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });

    const res = await PATCH(
      patchRequest({ photos: [newPhoto] }),
      makeContext(),
    );

    expect(res.status).toBe(200);
    expect(toSql(mockDeleteWhere.mock.calls[0][0]).params).toEqual([PHOTO_A]);
    expect(mockSortOrderSet).not.toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith([
      {
        foundItemId: VALID_ID,
        storagePath: "found/replaced.jpg",
        thumbPath: "found/replaced_thumb.jpg",
        sortOrder: 0,
      },
    ]);
  });

  it("正常：keepPhotoIds の順に並べ、外した写真の行を消し、新しい photos をそのあとに続ける", async () => {
    const { mockInsertValues, mockDeleteWhere, mockSortOrderSet } =
      mockPhotoTransaction({
        currentPhotos: [
          currentPhoto(PHOTO_A, "a", 0),
          currentPhoto(PHOTO_B, "b", 1),
          currentPhoto(PHOTO_C, "c", 2),
        ],
      });

    const res = await PATCH(
      patchRequest({ keepPhotoIds: [PHOTO_C, PHOTO_A], photos: [newPhoto] }),
      makeContext(),
    );

    expect(res.status).toBe(200);
    expect(toSql(mockDeleteWhere.mock.calls[0][0]).params).toEqual([PHOTO_B]);
    expect(mockSortOrderSet.mock.calls).toEqual([
      [{ sortOrder: 0 }, [PHOTO_C]],
      [{ sortOrder: 1 }, [PHOTO_A]],
    ]);
    expect(mockInsertValues).toHaveBeenCalledWith([
      {
        foundItemId: VALID_ID,
        storagePath: "found/replaced.jpg",
        thumbPath: "found/replaced_thumb.jpg",
        sortOrder: 2,
      },
    ]);
  });

  it("正常：keepPhotoIds だけなら、足さずに並べ替え・外しだけをする", async () => {
    const { mockInsertValues, mockDeleteWhere, mockSortOrderSet } =
      mockPhotoTransaction({
        currentPhotos: [
          currentPhoto(PHOTO_A, "a", 0),
          currentPhoto(PHOTO_B, "b", 1),
        ],
      });

    const res = await PATCH(
      patchRequest({ keepPhotoIds: [PHOTO_B] }),
      makeContext(),
    );

    expect(res.status).toBe(200);
    expect(toSql(mockDeleteWhere.mock.calls[0][0]).params).toEqual([PHOTO_A]);
    expect(mockSortOrderSet.mock.calls).toEqual([
      [{ sortOrder: 0 }, [PHOTO_B]],
    ]);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("Storage：外した写真のファイル（元の画像とサムネイル）を、コミットのあとで使われていなければ消す", async () => {
    const order: string[] = [];
    mockPhotoTransaction({
      currentPhotos: [
        currentPhoto(PHOTO_A, "a", 0),
        currentPhoto(PHOTO_B, "b", 1),
      ],
    });
    const transaction = mockTransaction.getMockImplementation()!;
    mockTransaction.mockImplementation(async (cb) => {
      const result = await transaction(cb);
      order.push("commit");
      return result;
    });
    mockRemovePhotoFilesIfUnused.mockImplementation(async () => {
      order.push("remove");
      return 2;
    });

    const res = await PATCH(
      patchRequest({ keepPhotoIds: [PHOTO_B] }),
      makeContext(),
    );

    expect(res.status).toBe(200);
    expect(mockRemovePhotoFilesIfUnused).toHaveBeenCalledWith([
      "found/a.jpg",
      "found/a_thumb.jpg",
    ]);
    expect(order).toEqual(["commit", "remove"]);
  });

  it("Storage：外した写真のファイルを消せなくても、保存は済んでいるので 200", async () => {
    mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });
    mockRemovePhotoFilesIfUnused.mockRejectedValue(new Error("storage down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await PATCH(patchRequest({ keepPhotoIds: [] }), makeContext());

    expect(res.status).toBe(200);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("Storage：写真を変えないときは、何も消さない", async () => {
    mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });

    const res = await PATCH(patchRequest({ color: "blue" }), makeContext());

    expect(res.status).toBe(200);
    expect(mockRemovePhotoFilesIfUnused).toHaveBeenCalledWith([]);
  });

  it("入力：新しく付ける写真のファイルが Storage になければ 400 で、写真を変えない", async () => {
    mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });
    mockFindMissingPhotoFiles.mockResolvedValue(["found/replaced_thumb.jpg"]);

    const res = await PATCH(
      patchRequest({ keepPhotoIds: [PHOTO_A], photos: [newPhoto] }),
      makeContext(),
    );

    expect(res.status).toBe(400);
    expect(mockFindMissingPhotoFiles).toHaveBeenCalledWith([
      "found/replaced.jpg",
      "found/replaced_thumb.jpg",
    ]);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockRemovePhotoFilesIfUnused).not.toHaveBeenCalled();
  });

  it("正常：keepPhotoIds と photos のどちらも送らなければ、写真に触らない", async () => {
    const { mockLock, mockDeleteWhere, mockInsertValues } =
      mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });

    const res = await PATCH(patchRequest({ color: "blue" }), makeContext());

    expect(res.status).toBe(200);
    expect(mockLock).not.toHaveBeenCalled();
    expect(mockDeleteWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it.each([
    ["ほかの拾得物の写真の ID", OTHER_PHOTO],
    ["存在しない写真の ID", "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"],
  ])(
    "入力：keepPhotoIds に%sがあれば 400 で、写真を変えない",
    async (_, photoId) => {
      const { mockInsertValues, mockDeleteWhere, mockSortOrderSet } =
        mockPhotoTransaction({ currentPhotos: [currentPhoto(PHOTO_A, "a")] });

      const res = await PATCH(
        patchRequest({ keepPhotoIds: [PHOTO_A, photoId] }),
        makeContext(),
      );

      expect(res.status).toBe(400);
      expect(mockDeleteWhere).not.toHaveBeenCalled();
      expect(mockSortOrderSet).not.toHaveBeenCalled();
      expect(mockInsertValues).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "keepPhotoIds に同じ ID が重複している",
      { keepPhotoIds: [PHOTO_A, PHOTO_A] },
    ],
    ["keepPhotoIds に UUID でない値がある", { keepPhotoIds: ["not-a-uuid"] }],
    [
      "keepPhotoIds と photos を合わせて 10 枚を超える",
      {
        keepPhotoIds: Array.from(
          { length: 10 },
          (_, i) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
        ),
        photos: [newPhoto],
      },
    ],
  ])(
    "入力の誤り：%sなら 400 で、トランザクションに入らない",
    async (_, body) => {
      mockPhotoTransaction();

      const res = await PATCH(patchRequest(body), makeContext());

      expect(res.status).toBe(400);
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );

  it("入力：ほかの拾得物が使っている写真のパスなら 400 で、写真を変えない", async () => {
    const { mockInsertValues, mockDeleteWhere } = mockPhotoTransaction({
      usedPhotos: [{ id: "33333333-3333-4333-8333-333333333333" }],
    });

    const res = await PATCH(
      patchRequest({ photos: [newPhoto] }),
      makeContext(),
    );

    expect(res.status).toBe(400);
    // トランザクションの中で失敗したら（ロールバック）、外すはずだった写真のファイルも消さない
    expect(mockRemovePhotoFilesIfUnused).not.toHaveBeenCalled();
    expect(mockDeleteWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("入力：残す写真と同じパスを新しい photos に入れたら 400 で、写真を変えない", async () => {
    const { mockInsertValues, mockDeleteWhere } = mockPhotoTransaction({
      currentPhotos: [currentPhoto(PHOTO_A, "a")],
    });

    const res = await PATCH(
      patchRequest({
        keepPhotoIds: [PHOTO_A],
        photos: [{ path: "found/a.jpg", thumbPath: "found/new_thumb.jpg" }],
      }),
      makeContext(),
    );

    expect(res.status).toBe(400);
    // トランザクションの中で失敗したら（ロールバック）、外すはずだった写真のファイルも消さない
    expect(mockRemovePhotoFilesIfUnused).not.toHaveBeenCalled();
    expect(mockDeleteWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("同時の操作：読んだあと、写真を変えるまでにほかの人が削除していたら 404 を返す", async () => {
    const { mockDeleteWhere, mockInsertValues } = mockPhotoTransaction({
      currentPhotos: [currentPhoto(PHOTO_A, "a")],
      locked: false,
    });

    const res = await PATCH(
      patchRequest({ keepPhotoIds: [PHOTO_A] }),
      makeContext(),
    );

    expect(res.status).toBe(404);
    // トランザクションの中で失敗したら（ロールバック）、外すはずだった写真のファイルも消さない
    expect(mockRemovePhotoFilesIfUnused).not.toHaveBeenCalled();
    expect(mockDeleteWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("replaceFoundItemPhotos", () => {
  const photo = (id: string, name: string, sortOrder: number) => ({
    id,
    storagePath: `found/${name}.jpg`,
    thumbPath: `found/${name}_thumb.jpg`,
    sortOrder,
  });
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  function makeTx(stillUsed: { storagePath: string; thumbPath: string }[]) {
    const sortOrderSet = vi.fn();
    const tx = {
      select: mockSelect({
        lock: vi.fn().mockResolvedValue([{ id: VALID_ID }]),
        used: [],
        awaited: [
          [photo(A, "a", 0), photo(B, "b", 1), photo(C, "c", 2)],
          stillUsed,
        ],
      }),
      delete: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
      update: () => ({
        set: (values: unknown) => ({
          where: vi.fn(async () => sortOrderSet(values)),
        }),
      }),
      insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
    };
    return { tx: tx as unknown as Tx, sortOrderSet };
  }

  it("外した写真のパスを返す。消したあともまだどれかの行が使っているパスの写真は除く", async () => {
    // B は新しい photos で付け直し、C はほかの拾得物の行も同じパスを指している
    const { tx } = makeTx([
      { storagePath: "found/b.jpg", thumbPath: "found/b_thumb.jpg" },
      { storagePath: "found/x.jpg", thumbPath: "found/c_thumb.jpg" },
    ]);

    const removed = await replaceFoundItemPhotos(
      tx,
      VALID_ID,
      [],
      [{ path: "found/b.jpg", thumbPath: "found/b_thumb.jpg" }],
    );

    expect(removed).toEqual([
      { path: "found/a.jpg", thumbPath: "found/a_thumb.jpg" },
    ]);
  });

  it("並びが変わらない写真の sortOrder は書き直さない", async () => {
    const { tx, sortOrderSet } = makeTx([]);

    const removed = await replaceFoundItemPhotos(tx, VALID_ID, [A, C], []);

    // A は 0 のまま、C だけ 2 → 1
    expect(sortOrderSet.mock.calls).toEqual([[{ sortOrder: 1 }]]);
    expect(removed).toEqual([
      { path: "found/b.jpg", thumbPath: "found/b_thumb.jpg" },
    ]);
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
