import { describe, expect, expectTypeOf, it } from "vitest";
import type { RowOf } from "@/db";
import type { Staff } from "@/lib/auth/staff";
import { foundItemListWith, foundItemWith } from "@/lib/queries/found-items";
import { FoundItem } from "@/lib/schemas/found-item";
import { type FoundItemRow, photoPathsOf, toFoundItem } from "./found-item";

const member: Staff = { email: "member@example.com", role: "member" };
const otherMember: Staff = { email: "other@example.com", role: "member" };
const admin: Staff = { email: "admin@example.com", role: "admin" };

const photoUrlOf = (path: string) => `https://example.com/${path}`;

function row(overrides: Partial<FoundItemRow> = {}): FoundItemRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    number: 42,
    categoryId: 6,
    features: "紺色のイヤホン",
    brand: "SONY",
    foundPlace: "屋外ステージ付近",
    foundAt: new Date("2026-09-19T04:35:00.000Z"),
    isValuable: false,
    memo: null,
    status: "received",
    registeredByEmail: member.email,
    disposedAt: null,
    disposalNote: null,
    createdAt: new Date("2026-09-19T04:36:00.000Z"),
    updatedAt: new Date("2026-09-19T04:36:00.000Z"),
    deletedAt: null,
    category: { id: 6, name: "電気製品類" },
    photos: [],
    matches: [],
    handovers: [],
    ...overrides,
  };
}

describe("toFoundItem", () => {
  it("API の FoundItem の形にする", () => {
    const item = toFoundItem(row(), member, photoUrlOf);
    expect(FoundItem.parse(item)).toEqual(item);
    expect(item).toMatchObject({
      displayNumber: "拾-00042",
      category: { id: 6, name: "電気製品類" },
      foundAt: "2026-09-19T04:35:00.000Z",
      activeMatch: null,
      handover: null,
    });
  });

  it("canEdit は自分の登録か admin なら true", () => {
    expect(toFoundItem(row(), member, photoUrlOf).canEdit).toBe(true);
    expect(toFoundItem(row(), otherMember, photoUrlOf).canEdit).toBe(false);
    expect(toFoundItem(row(), admin, photoUrlOf).canEdit).toBe(true);
  });

  it("有効な紐づけを activeMatch にする", () => {
    const item = toFoundItem(
      row({
        status: "matching",
        matches: [
          {
            lostReport: {
              id: "22222222-2222-4222-8222-222222222222",
              number: 118,
            },
          },
        ],
      }),
      member,
      photoUrlOf,
    );
    expect(item.activeMatch).toEqual({
      lostReportId: "22222222-2222-4222-8222-222222222222",
      displayNumber: "申-00118",
    });
  });

  it("受け渡しの記録を handover にする（先頭の 1 件）", () => {
    const item = toFoundItem(
      row({
        status: "resolved",
        handovers: [
          {
            handedAt: new Date("2026-09-19T06:00:00.000Z"),
            receiverName: "山田",
          },
          {
            handedAt: new Date("2026-09-19T05:00:00.000Z"),
            receiverName: null,
          },
        ],
      }),
      member,
      photoUrlOf,
    );
    expect(item.handover).toEqual({
      handedAt: "2026-09-19T06:00:00.000Z",
      receiverName: "山田",
    });
  });

  it("写真のパスを URL にする", () => {
    const item = toFoundItem(
      row({
        photos: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            storagePath: "found/a.jpg",
            thumbPath: "found/a_thumb.jpg",
          },
        ],
      }),
      member,
      photoUrlOf,
    );
    expect(item.photos).toEqual([
      {
        id: "33333333-3333-4333-8333-333333333333",
        url: "https://example.com/found/a.jpg",
        thumbUrl: "https://example.com/found/a_thumb.jpg",
      },
    ]);
  });
});

describe("photoPathsOf", () => {
  it("全部の行の写真のパス（元画像とサムネイル）を集める", () => {
    const photo = (name: string) => ({
      id: "33333333-3333-4333-8333-333333333333",
      storagePath: `found/${name}.jpg`,
      thumbPath: `found/${name}_thumb.jpg`,
    });
    expect(
      photoPathsOf([
        row({ photos: [photo("a")] }),
        row({ photos: [photo("b")] }),
      ]),
    ).toEqual([
      "found/a.jpg",
      "found/a_thumb.jpg",
      "found/b.jpg",
      "found/b_thumb.jpg",
    ]);
  });
});

describe("foundItemWith", () => {
  it("一覧では写真を 1 枚目だけ取る", () => {
    expect(foundItemListWith.photos.limit).toBe(1);
    expect("limit" in foundItemWith.photos).toBe(false);
  });

  it("取った行を、そのまま toFoundItem に渡せる（型の確認）", () => {
    expectTypeOf<
      RowOf<"foundItems", typeof foundItemWith>
    >().toExtend<FoundItemRow>();
    expectTypeOf<
      RowOf<"foundItems", typeof foundItemListWith>
    >().toExtend<FoundItemRow>();
  });
});
