import { describe, expect, it } from "vitest";
import { ITEM_COLORS } from "@/db/enums";
import {
  CreateLostReportBody,
  LostReportCancelBody,
  LostReportIdParams,
  LostReportPatchBody,
  LostReportPickupBody,
  MyLostReportListQuery,
} from "./lost-report";

describe("CreateLostReportBody", () => {
  it("必須項目のみで通す", () => {
    const input = {
      categoryId: 6,
      color: "black",
      lostPlace: "屋外ステージ周辺",
      lostAt: "2026-09-19T13:00:00+09:00",
    };
    expect(CreateLostReportBody.parse(input)).toEqual(input);
  });

  it("任意項目（brand・note）を含めて通す", () => {
    const input = {
      categoryId: 6,
      color: "black",
      brand: "SONY",
      lostPlace: "屋外ステージ周辺",
      lostAt: "2026-09-19T13:00:00+09:00",
      note: "ケースに傷があります",
    };
    expect(CreateLostReportBody.parse(input)).toEqual(input);
  });

  it("色の不正値や必須項目の欠落はエラーにする", () => {
    expect(() =>
      CreateLostReportBody.parse({
        categoryId: 6,
        color: "invalid-color",
        lostPlace: "屋外ステージ周辺",
        lostAt: "2026-09-19T13:00:00+09:00",
      }),
    ).toThrow();

    expect(() =>
      CreateLostReportBody.parse({
        categoryId: 6,
        lostPlace: "屋外ステージ周辺",
        lostAt: "2026-09-19T13:00:00+09:00",
      }),
    ).toThrow();
  });
});

describe("MyLostReportListQuery", () => {
  it("指定なしならデフォルト値（page=1, limit=20）になる", () => {
    expect(MyLostReportListQuery.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("文字列の page と limit を数値に変換する", () => {
    expect(MyLostReportListQuery.parse({ page: "2", limit: "10" })).toEqual({
      page: 2,
      limit: 10,
    });
  });
});

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

describe("LostReportPickupBody", () => {
  it("today・later は note がなくても通す", () => {
    expect(LostReportPickupBody.parse({ method: "today" })).toEqual({
      method: "today",
    });
    expect(LostReportPickupBody.parse({ method: "later", note: null })).toEqual(
      { method: "later", note: null },
    );
  });

  it("note の前後の空白を除く", () => {
    expect(
      LostReportPickupBody.parse({ method: "other", note: " 明日の朝 " }),
    ).toEqual({ method: "other", note: "明日の朝" });
  });

  it("other で note がない・null・空白だけならエラーにする", () => {
    for (const note of [undefined, null, " "]) {
      expect(
        LostReportPickupBody.safeParse({ method: "other", note }).success,
      ).toBe(false);
    }
  });
});

describe("LostReportCancelBody", () => {
  it("reason だけで通す（note は任意）", () => {
    expect(LostReportCancelBody.parse({ reason: "no_longer_needed" })).toEqual({
      reason: "no_longer_needed",
    });
  });

  it("決めた値でない reason はエラーにする", () => {
    expect(LostReportCancelBody.safeParse({ reason: "x" }).success).toBe(false);
  });
});
