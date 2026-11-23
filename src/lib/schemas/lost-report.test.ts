import { describe, expect, it } from "vitest";
import { CreateLostReportBody, MyLostReportListQuery } from "./lost-report";

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
