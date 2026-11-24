import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// 登録の、使用済みの写真のパスの確認を確かめる（DB は mock にする）
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  requireStaff: vi.fn(async () => ({
    role: "member",
    email: "member@example.com",
  })),
}));
// Storage にないファイルのパス（findMissingPhotoFiles が返すもの）
const missingFiles = vi.hoisted(() => vi.fn<() => string[]>(() => []));
vi.mock("@/lib/storage/photos", () => ({
  signPhotoUrls: vi.fn(async () => () => ""),
  findMissingPhotoFiles: vi.fn(async (paths: string[]) =>
    paths.filter((path) => missingFiles().includes(path)),
  ),
}));
vi.mock("@/lib/serializers/found-item", () => ({
  photoPathsOf: vi.fn(() => []),
  toFoundItem: vi.fn((row) => ({ id: row.id })),
}));
vi.mock("@/db", () => ({
  getDb: () => ({
    transaction: async (cb: (tx: unknown) => unknown) =>
      cb({ select: mockSelect, insert: mockInsert }),
  }),
}));

// tx.select().from().where() はカテゴリの行を、続けて .limit() すると写真の行を返す
function mockRows(
  category: { id: number; name: string },
  usedPhotos: { id: string }[],
) {
  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: () =>
        Object.assign(
          Promise.resolve([{ ...category, isValuableDefault: false }]),
          {
            limit: vi.fn().mockResolvedValue(usedPhotos),
          },
        ),
    }),
  }));
  mockInsert.mockImplementation(() => ({
    values: () => ({
      returning: vi.fn().mockResolvedValue([{ id: "new-id" }]),
    }),
  }));
}

const request = (body: unknown) =>
  new Request("http://localhost/api/found-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const base = { categoryId: 1, color: "red", foundPlace: "体育館" };
const photos = [{ path: "found/a", thumbPath: "found/a_thumb" }];

beforeEach(() => {
  mockSelect.mockReset();
  mockInsert.mockReset();
  missingFiles.mockReset().mockReturnValue([]);
});

describe("POST /api/found-items", () => {
  it("ほかの拾得物が使っている写真のパスなら 400 で、登録しない", async () => {
    mockRows({ id: 1, name: "電気製品類" }, [{ id: "used" }]);
    const res = await POST(request({ ...base, photos }), undefined);
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("使われていない写真のパスなら 201", async () => {
    mockRows({ id: 1, name: "電気製品類" }, []);
    const res = await POST(request({ ...base, photos }), undefined);
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalled();
  });

  it.each([["found/a"], ["found/a_thumb"]])(
    "写真のファイル（%s）が Storage になければ 400 で、DB を見ない",
    async (missing) => {
      missingFiles.mockReturnValue([missing]);
      const res = await POST(request({ ...base, photos }), undefined);
      expect(res.status).toBe(400);
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    },
  );

  it("写真なし（証明書・カード・定期券類）なら、写真のパスを確かめずに 201", async () => {
    mockRows({ id: 1, name: "証明書・カード・定期券類" }, [{ id: "used" }]);
    const res = await POST(request({ ...base, photos: [] }), undefined);
    expect(res.status).toBe(201);
    // カテゴリを取る 1 回だけ
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/found-items", () => {
  // DB の mock は transaction しか持たないので、DB を使えば 500 になる
  it("page が 100000 を超えれば、DB の前で 400", async () => {
    const response = await GET(
      new Request("http://localhost/api/found-items?page=100001&limit=100"),
      undefined,
    );
    expect(response.status).toBe(400);
  });
});
