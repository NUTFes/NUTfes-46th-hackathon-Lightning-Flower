import { describe, expect, it } from "vitest";
import { conflictOnUniqueViolation, notFoundOrConflict } from "./transition";

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

describe("conflictOnUniqueViolation", () => {
  const onError = conflictOnUniqueViolation("すでに有効な紐づけがあります");

  it("UNIQUE 制約の違反（Drizzle が cause に入れたもの）を 409 にする", () => {
    const pgError = Object.assign(new Error("duplicate key"), {
      code: "23505",
    });
    const error = new Error("Failed query", { cause: pgError });
    expect(() => onError(error)).toThrow(
      expect.objectContaining({ code: "CONFLICT" }),
    );
  });

  it("ほかのエラーはそのまま投げ直す", () => {
    const error = Object.assign(new Error("deadlock"), { code: "40P01" });
    expect(() => onError(error)).toThrow(error);
  });
});
