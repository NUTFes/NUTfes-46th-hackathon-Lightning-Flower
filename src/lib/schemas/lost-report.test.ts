import { describe, expect, it } from "vitest";
import { LostReportIdParams, LostReportPatchBody } from "./lost-report";

describe("LostReportIdParams", () => {
  it("有効な UUID を通す", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(LostReportIdParams.parse({ id })).toEqual({ id });
  });

  it("UUID 以外はエラーにする", () => {
    expect(() => LostReportIdParams.parse({ id: "not-a-uuid" })).toThrow();
  });
});

describe("LostReportPatchBody", () => {
  it("一部の項目だけの更新を通す", () => {
    const parsed = LostReportPatchBody.parse({
      features: "黒い折りたたみ傘",
      brand: null,
    });
    expect(parsed).toEqual({
      features: "黒い折りたたみ傘",
      brand: null,
    });
  });

  it("すべての変更可能項目を通す", () => {
    const input = {
      categoryId: 3,
      features: "白いモバイルバッテリー",
      brand: "Anker",
      lostPlace: "講義棟 101",
      lostAt: "2026-09-19T13:35:00+09:00",
      note: "ステッカーが貼ってある",
    };
    expect(LostReportPatchBody.parse(input)).toEqual(input);
  });

  it("空オブジェクトはエラーにする", () => {
    expect(() => LostReportPatchBody.parse({})).toThrow();
  });

  it("空文字や範囲外の categoryId はエラーにする", () => {
    expect(() => LostReportPatchBody.parse({ features: "   " })).toThrow();
    expect(() => LostReportPatchBody.parse({ categoryId: 0 })).toThrow();
    expect(() => LostReportPatchBody.parse({ categoryId: 99999 })).toThrow();
  });
});
