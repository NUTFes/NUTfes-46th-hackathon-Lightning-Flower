import { describe, expect, it } from "vitest";
import { nameFromMetadata } from "./guest";

describe("nameFromMetadata", () => {
  it("full_name を先に使う", () => {
    expect(nameFromMetadata({ full_name: " 技大 太郎 ", name: "taro" })).toBe(
      "技大 太郎",
    );
  });

  it("full_name がなければ name を使う", () => {
    expect(nameFromMetadata({ name: "taro" })).toBe("taro");
  });

  it.each([[undefined], [null], ["str"], [{}], [{ full_name: "  ", name: 1 }]])(
    "名前がなければ undefined（%j）",
    (metadata) => {
      expect(nameFromMetadata(metadata)).toBeUndefined();
    },
  );
});
