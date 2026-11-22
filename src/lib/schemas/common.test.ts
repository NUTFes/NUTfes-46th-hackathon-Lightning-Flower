import { describe, expect, it } from "vitest";
import { FOUND_STATUSES } from "@/db/enums";
import { BooleanQuery, csvEnum, PageQuery, toOffset } from "./common";
import { FoundItemListQuery } from "./found-item";

describe("PageQuery", () => {
  it("指定がなければ page=1・limit=20", () => {
    expect(PageQuery.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("文字列を数にする", () => {
    expect(PageQuery.parse({ page: "3", limit: "50" })).toEqual({
      page: 3,
      limit: 50,
    });
  });

  it("page は 1 以上、limit は 1〜100", () => {
    expect(PageQuery.safeParse({ page: "0" }).success).toBe(false);
    expect(PageQuery.safeParse({ limit: "0" }).success).toBe(false);
    expect(PageQuery.safeParse({ limit: "101" }).success).toBe(false);
    expect(PageQuery.safeParse({ page: "1.5" }).success).toBe(false);
  });

  it("toOffset で OFFSET にする", () => {
    expect(toOffset({ page: 1, limit: 20 })).toBe(0);
    expect(toOffset({ page: 3, limit: 20 })).toBe(40);
  });
});

describe("csvEnum", () => {
  const Status = csvEnum(FOUND_STATUSES);

  it("カンマ区切りを配列にする", () => {
    expect(Status.parse("received,matching")).toEqual(["received", "matching"]);
  });

  it("空の要素は無視する", () => {
    expect(Status.parse("received,")).toEqual(["received"]);
  });

  it("enum にない値・空はエラー", () => {
    expect(Status.safeParse("received,lost").success).toBe(false);
    expect(Status.safeParse("").success).toBe(false);
    expect(Status.safeParse(",").success).toBe(false);
  });
});

describe("BooleanQuery", () => {
  it('"true" / "false" を真偽値にする', () => {
    expect(BooleanQuery.parse("true")).toBe(true);
    expect(BooleanQuery.parse("false")).toBe(false);
  });

  it("それ以外はエラー", () => {
    expect(BooleanQuery.safeParse("1").success).toBe(false);
    expect(BooleanQuery.safeParse("").success).toBe(false);
  });
});

describe("FoundItemListQuery", () => {
  it("クエリ文字列を型のある値にする", () => {
    expect(
      FoundItemListQuery.parse({
        q: " 財布 ",
        status: "received,matching",
        categoryId: "3",
        foundFrom: "2026-11-21T00:00:00+09:00",
        mine: "true",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      q: "財布",
      status: ["received", "matching"],
      categoryId: 3,
      foundFrom: "2026-11-21T00:00:00+09:00",
      mine: true,
    });
  });

  it("空白だけの q はエラー、日時でない foundFrom もエラー", () => {
    expect(FoundItemListQuery.safeParse({ q: "  " }).success).toBe(false);
    expect(
      FoundItemListQuery.safeParse({ foundFrom: "2026-11-21" }).success,
    ).toBe(false);
  });
});
