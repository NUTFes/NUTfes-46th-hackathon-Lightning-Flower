import { describe, expect, it } from "vitest";
import { ITEM_COLORS } from "@/db/enums";
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
      color: ITEM_COLORS[0],
      brand: null,
    });
    expect(parsed).toEqual({
      color: ITEM_COLORS[0],
      brand: null,
    });
  });

  it("すべての変更可能項目を通す", () => {
    const input = {
      categoryId: 3,
      color: ITEM_COLORS[1] ?? ITEM_COLORS[0],
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

  it("決まった色でない値や範囲外の categoryId はエラーにする", () => {
    expect(() => LostReportPatchBody.parse({ color: "rainbow" })).toThrow();
    expect(() => LostReportPatchBody.parse({ color: "" })).toThrow();
    expect(() => LostReportPatchBody.parse({ categoryId: 0 })).toThrow();
    expect(() => LostReportPatchBody.parse({ categoryId: 99999 })).toThrow();
  });
});
