import { describe, expect, it } from "vitest";
import { FoundItemCreateBody } from "./found-item";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 6,
    color: "navy",
    foundPlace: "屋外ステージ付近",
    photos: [
      {
        path: "found/a.jpg",
        thumbPath: "found/a_thumb.jpg",
      },
    ],
    ...overrides,
  };
}

describe("FoundItemCreateBody", () => {
  it("必須項目がそろっていれば通る", () => {
    const result = FoundItemCreateBody.safeParse(validBody());
    expect(result.success).toBe(true);
  });

  it("任意項目（brand / foundAt / isValuable / memo）を含めても通る", () => {
    const result = FoundItemCreateBody.safeParse(
      validBody({
        brand: "SONY",
        foundAt: "2026-09-19T04:35:00.000Z",
        isValuable: true,
        memo: "ケース付き",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("任意項目に null を渡しても通る", () => {
    const result = FoundItemCreateBody.safeParse(
      validBody({
        brand: null,
        memo: null,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("photos が空配列でもスキーマ単体では通る（カテゴリ依存の必須チェックは API 側で行う）", () => {
    const result = FoundItemCreateBody.safeParse(validBody({ photos: [] }));
    expect(result.success).toBe(true);
  });

  it("color が ITEM_COLORS 以外の値や空文字なら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ color: "invalid_color" }))
        .success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ color: "" })).success,
    ).toBe(false);
  });

  it("brand が空文字や空白だけなら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ brand: "" })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ brand: "   " })).success,
    ).toBe(false);
  });

  it("foundPlace が空文字または空白だけなら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ foundPlace: "" })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ foundPlace: "   " })).success,
    ).toBe(false);
  });

  it("categoryId が範囲外（0, 32768, 負数, 小数）なら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: 0 })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: 32768 })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: -1 })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: 1.5 })).success,
    ).toBe(false);
  });

  it("categoryId が boolean や文字列なら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: true })).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(validBody({ categoryId: "6" })).success,
    ).toBe(false);
  });

  it("foundAt が ISO 日時以外なら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ foundAt: "2026-09-19" }))
        .success,
    ).toBe(false);
  });

  it("photos の path / thumbPath が空文字や同一パスなら弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(
        validBody({ photos: [{ path: "", thumbPath: "found/a_thumb.jpg" }] }),
      ).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(
        validBody({ photos: [{ path: "found/a.jpg", thumbPath: "" }] }),
      ).success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(
        validBody({
          photos: [{ path: "found/same.jpg", thumbPath: "found/same.jpg" }],
        }),
      ).success,
    ).toBe(false);
  });

  it("photos が found/ 以外や .. / バックスラッシュ / 二重スラッシュを含むパスなら弾く", () => {
    const badPaths = [
      "other/a.jpg",
      "found/../a.jpg",
      "found/%2e%2e/a.jpg",
      "found\\a.jpg",
      "found//a.jpg",
      "found/",
    ];

    for (const p of badPaths) {
      expect(
        FoundItemCreateBody.safeParse(
          validBody({ photos: [{ path: p, thumbPath: "found/a_thumb.jpg" }] }),
        ).success,
      ).toBe(false);
      expect(
        FoundItemCreateBody.safeParse(
          validBody({ photos: [{ path: "found/a.jpg", thumbPath: p }] }),
        ).success,
      ).toBe(false);
    }
  });

  it("photos が 11 件以上や重複パスなら弾く", () => {
    const elevenPhotos = Array.from({ length: 11 }, (_, i) => ({
      path: `found/p${i}.jpg`,
      thumbPath: `found/p${i}_thumb.jpg`,
    }));
    expect(
      FoundItemCreateBody.safeParse(validBody({ photos: elevenPhotos }))
        .success,
    ).toBe(false);

    expect(
      FoundItemCreateBody.safeParse(
        validBody({
          photos: [
            { path: "found/a.jpg", thumbPath: "found/a_thumb.jpg" },
            { path: "found/a.jpg", thumbPath: "found/b_thumb.jpg" },
          ],
        }),
      ).success,
    ).toBe(false);

    expect(
      FoundItemCreateBody.safeParse(
        validBody({
          photos: [
            { path: "found/a.jpg", thumbPath: "found/shared.jpg" },
            { path: "found/shared.jpg", thumbPath: "found/b_thumb.jpg" },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("NUL 文字を含む文字列を弾く", () => {
    expect(
      FoundItemCreateBody.safeParse(validBody({ foundPlace: "屋外ステージ\0" }))
        .success,
    ).toBe(false);
    expect(
      FoundItemCreateBody.safeParse(
        validBody({
          photos: [{ path: "found/a.jpg\0", thumbPath: "found/a_thumb.jpg" }],
        }),
      ).success,
    ).toBe(false);
  });
});
