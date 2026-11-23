import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT_PATH, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/home", "/home"],
    ["/lost-reports/new?from=top#form", "/lost-reports/new?from=top#form"],
    ["/lost-reports/../home", "/home"],
  ])("サイトの中のパス %s は通す", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["home"],
    ["https://evil.example/"],
    ["//evil.example/"],
    ["/\\evil.example/"],
    ["/\t/evil.example/"],
    ["/\n/evil.example/"],
    ["javascript:alert(1)"],
  ])("外のサイトや変な値 %j は既定のパスにする", (next) => {
    expect(safeNextPath(next)).toBe(DEFAULT_NEXT_PATH);
  });
});
