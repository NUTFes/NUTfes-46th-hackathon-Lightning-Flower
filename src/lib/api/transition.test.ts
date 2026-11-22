import { describe, expect, it } from "vitest";
import { notFoundOrConflict } from "./transition";

describe("notFoundOrConflict", () => {
  it("行があれば、状態が違うので 409 にする", async () => {
    const error = await notFoundOrConflict(
      Promise.resolve({ id: "x" }),
      "この申請は「探し中」ではありません",
    );
    expect(error).toMatchObject({
      code: "CONFLICT",
      message: "この申請は「探し中」ではありません",
    });
  });

  it("行がなければ 404 にする", async () => {
    const error = await notFoundOrConflict(
      Promise.resolve(undefined),
      "この申請は「探し中」ではありません",
      "申請が見つかりません",
    );
    expect(error).toMatchObject({
      code: "NOT_FOUND",
      message: "申請が見つかりません",
    });
  });
});
