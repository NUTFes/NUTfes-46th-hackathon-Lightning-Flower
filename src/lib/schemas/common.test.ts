import { describe, expect, it } from "vitest";
import { FOUND_STATUSES } from "@/db/enums";
import {
  DateTime,
  BooleanQuery,
  csvEnum,
  DateTimeQuery,
  LIMIT_MAX,
  PAGE_MAX,
  PageQuery,
  SearchQuery,
  SmallIdQuery,
  toOffset,
} from "./common";
import {
  FoundItemListQuery,
  FoundItemListQueryBase,
  withFoundRangeCheck,
} from "./found-item";

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

  it("page は 100000 まで（OFFSET が 2^31 を超えないように）", () => {
    expect(PageQuery.parse({ page: String(PAGE_MAX) }).page).toBe(PAGE_MAX);
    expect(PageQuery.safeParse({ page: String(PAGE_MAX + 1) }).success).toBe(
      false,
    );
    // 1e17 でも、上限の文言だけを返す（int の範囲の文言を一緒に出さない）
    const huge = PageQuery.safeParse({ page: "1e17" });
    expect(huge.error?.issues.map((issue) => issue.message)).toEqual([
      `page は ${PAGE_MAX} までにしてください`,
    ]);
    expect(PageQuery.safeParse({ page: "-1e17" }).error?.issues).toHaveLength(
      1,
    );
    expect(toOffset({ page: PAGE_MAX, limit: LIMIT_MAX })).toBeLessThan(
      2 ** 31,
    );
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
        color: "navy,blue",
        foundFrom: "2026-11-21T00:00:00+09:00",
        mine: "true",
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      q: "財布",
      status: ["received", "matching"],
      categoryId: 3,
      color: ["navy", "blue"],
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

  it("Base から項目を減らしても、日時の前後のチェックを付け直せる", () => {
    const Query = withFoundRangeCheck(
      FoundItemListQueryBase.omit({ mine: true }),
    );
    expect(Query.parse({ mine: "true" })).not.toHaveProperty("mine");
    expect(
      Query.safeParse({
        foundFrom: "2026-09-20T00:00:00Z",
        foundTo: "2026-09-19T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("決まった色でない color はエラー", () => {
    expect(FoundItemListQuery.safeParse({ color: "黒" }).success).toBe(false);
  });

  it("日時でない foundFrom はエラー", () => {
    expect(
      FoundItemListQuery.safeParse({ foundFrom: "2026-11-21" }).success,
    ).toBe(false);
  });
});

describe("DateTime", () => {
  it("2000 年から 2099 年までの日時を受ける", () => {
    expect(DateTime.safeParse("2000-01-01T00:00:00Z").success).toBe(true);
    expect(DateTime.safeParse("2099-12-31T23:59:59+09:00").success).toBe(true);
  });

  it.each([
    "0000-01-01T00:00:00Z",
    "1999-12-31T23:59:59Z",
    "2100-01-01T00:00:00Z",
  ])("範囲外の %s は通さない（DB に送ると 500 になる年を止める）", (value) => {
    expect(DateTime.safeParse(value).success).toBe(false);
  });
});
