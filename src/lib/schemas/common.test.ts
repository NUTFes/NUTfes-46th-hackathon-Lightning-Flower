import { describe, expect, it } from "vitest";
import { FOUND_STATUSES } from "@/db/enums";
import {
  BooleanQuery,
  csvEnum,
  DateTimeQuery,
  PageQuery,
  SearchQuery,
  SmallIdQuery,
  toOffset,
} from "./common";
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

describe("SearchQuery", () => {
  it("前後の空白（全角も）を除き、空になったら指定なし", () => {
    expect(SearchQuery.parse("　財布 ")).toBe("財布");
    expect(SearchQuery.parse(" ")).toBeUndefined();
    expect(SearchQuery.parse("　")).toBeUndefined();
  });
});

describe("SmallIdQuery", () => {
  it("1〜32767 の整数だけを受ける（DB の smallint）", () => {
    expect(SmallIdQuery.parse("3")).toBe(3);
    expect(SmallIdQuery.safeParse("0").success).toBe(false);
    expect(SmallIdQuery.safeParse("32768").success).toBe(false);
    expect(SmallIdQuery.safeParse("abc").success).toBe(false);
  });
});

describe("DateTimeQuery", () => {
  it("+ をエンコードせずに送って空白になったオフセットを戻す", () => {
    // ?foundFrom=2026-09-19T10:00:00+09:00 は、URLSearchParams で + が空白になって届く
    const value = new URLSearchParams(
      "foundFrom=2026-09-19T10:00:00+09:00",
    ).get("foundFrom");
    expect(DateTimeQuery.parse(value)).toBe("2026-09-19T10:00:00+09:00");
    expect(DateTimeQuery.parse("2026-09-19T01:00:00Z")).toBe(
      "2026-09-19T01:00:00Z",
    );
  });

  it("日時でなければエラー", () => {
    expect(DateTimeQuery.safeParse("2026-09-19").success).toBe(false);
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

  it("空白だけの q は指定なし", () => {
    expect(FoundItemListQuery.parse({ q: "  " }).q).toBeUndefined();
  });

  it("foundTo が foundFrom より前ならエラー（オフセットが違っても日時で比べる）", () => {
    expect(
      FoundItemListQuery.safeParse({
        foundFrom: "2026-09-20T00:00:00Z",
        foundTo: "2026-09-19T00:00:00Z",
      }).success,
    ).toBe(false);
    // 2026-09-19T09:00+09:00 と 2026-09-19T00:00Z は同じ時刻
    expect(
      FoundItemListQuery.safeParse({
        foundFrom: "2026-09-19T09:00:00+09:00",
        foundTo: "2026-09-19T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("日時でない foundFrom はエラー", () => {
    expect(
      FoundItemListQuery.safeParse({ foundFrom: "2026-11-21" }).success,
    ).toBe(false);
  });
});
