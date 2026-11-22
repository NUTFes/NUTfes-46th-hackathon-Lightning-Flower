import { describe, expect, it } from "vitest";
import { containsPattern } from "./like";

describe("containsPattern", () => {
  it("前後に % を付ける", () => {
    expect(containsPattern("財布")).toBe("%財布%");
  });

  it("入力の % _ \\ はエスケープして文字として探す", () => {
    expect(containsPattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});
