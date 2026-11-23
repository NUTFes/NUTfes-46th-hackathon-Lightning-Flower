import { QueryBuilder } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { lostReports } from "@/db/schema";
import { LostReportListQuery } from "@/lib/schemas/lost-report";
import { lostReportFilters } from "./lost-reports";

// DB につながずに、lostReportFilters が作る where の SQL とパラメータを見る
function toWhere(input: Record<string, string>) {
  const query = LostReportListQuery.parse(input);
  return new QueryBuilder()
    .select({ id: lostReports.id })
    .from(lostReports)
    .where(lostReportFilters(query))
    .toSQL();
}

describe("lostReportFilters", () => {
  it("条件がなければ where を付けない", () => {
    expect(toWhere({}).sql).not.toContain("where");
  });

  it("q は場所・備考の部分一致で、brand は探さない", () => {
    const { sql, params } = toWhere({ q: "イヤホン" });
    expect(sql).toContain('"lost_place" ilike');
    expect(sql).toContain('"note" ilike');
    expect(sql).not.toContain('"brand"');
    expect(sql).not.toContain('"number" =');
    expect(params).toEqual(["%イヤホン%", "%イヤホン%"]);
  });

  it.each(["申-00118", "申00118", "00118", "118"])(
    "q=%s は番号 118 でも探す",
    (q) => {
      const { sql, params } = toWhere({ q });
      expect(sql).toContain('"number" =');
      expect(params[0]).toBe(118);
    },
  );

  it("q の % と _ は文字として探す", () => {
    const { params } = toWhere({ q: "100%_off" });
    expect(params).toEqual(["%100\\%\\_off%", "%100\\%\\_off%"]);
  });

  it("status はカンマ区切りで複数を、categoryId は 1 つを絞る", () => {
    const { sql, params } = toWhere({
      status: "searching,maybe_found",
      categoryId: "6",
    });
    expect(sql).toContain('"status" in ($1, $2)');
    expect(sql).toContain('"category_id" = $3');
    expect(params).toEqual(["searching", "maybe_found", 6]);
  });

  it("awaitingReply は共通の返信待ちの条件を使い、false はその否定にする", () => {
    const yes = toWhere({ awaitingReply: "true" }).sql;
    const no = toWhere({ awaitingReply: "false" }).sql;
    expect(yes).toContain("distinct on");
    expect(yes).not.toContain("where not (");
    const where = (sql: string) => sql.slice(sql.indexOf(" where ") + 7);
    expect(where(no)).toBe(`not ${where(yes)}`);
  });
});
