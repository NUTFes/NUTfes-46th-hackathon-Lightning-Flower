import { describe, expect, it } from "vitest";
import { mergeMessages, pollAfterOf, reportTitleOf } from "./chat-utils";

describe("reportTitleOf", () => {
  it("色とカテゴリをつなぐ", () => {
    expect(
      reportTitleOf({ color: "navy", category: { name: "イヤホン" } }),
    ).toBe("紺のイヤホン");
  });

  it("色が「その他」のときはカテゴリだけ", () => {
    expect(reportTitleOf({ color: "other", category: { name: "財布" } })).toBe(
      "財布",
    );
  });
});

describe("pollAfterOf", () => {
  it("最新より 5 秒前から取る", () => {
    expect(pollAfterOf("2026-11-24T10:00:05.000Z")).toBe(
      "2026-11-24T10:00:00.000Z",
    );
  });
});

describe("mergeMessages", () => {
  it("id の重なりを除き、古い順に並べる", () => {
    const a = { id: "a", createdAt: "2026-11-24T10:00:00.000Z" };
    const b = { id: "b", createdAt: "2026-11-24T10:00:01.000Z" };
    const c = { id: "c", createdAt: "2026-11-24T10:00:02.000Z" };
    expect(mergeMessages([a, c], [c, b])).toEqual([a, b, c]);
  });
});
