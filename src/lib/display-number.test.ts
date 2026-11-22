import { describe, expect, it } from "vitest";
import { formatFoundNumber, formatLostNumber } from "./display-number";

describe("display-number", () => {
  it("5 桁にそろえて記号を付ける", () => {
    expect(formatFoundNumber(42)).toBe("拾-00042");
    expect(formatLostNumber(118)).toBe("申-00118");
  });
});
