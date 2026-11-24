import { describe, expect, it } from "vitest";
import { PHOTO_FILE_MISSING_MESSAGE } from "@/lib/schemas/photo";
import { FetchApiError } from "./fetch-api";
import { foundItemSaveFailureOf } from "./photo-upload";

describe("foundItemSaveFailureOf", () => {
  it("写真のファイルがない 400 は、写真の欄のエラーにする（フォームが写真を上げ直す）", () => {
    expect(
      foundItemSaveFailureOf(
        new FetchApiError(400, PHOTO_FILE_MISSING_MESSAGE),
      ),
    ).toEqual({
      ok: false,
      error: PHOTO_FILE_MISSING_MESSAGE,
      fieldErrors: { photos: PHOTO_FILE_MISSING_MESSAGE },
    });
  });

  it.each([
    ["ほかの 400", new FetchApiError(400, "入力を確かめてください")],
    [
      "同じ文言でも 400 でない",
      new FetchApiError(409, PHOTO_FILE_MISSING_MESSAGE),
    ],
    ["通信が切れた", new TypeError("Failed to fetch")],
  ])("%s は、写真の欄のエラーにしない", (_, error) => {
    const failure = foundItemSaveFailureOf(error);
    expect(failure.ok).toBe(false);
    expect(failure.fieldErrors).toBeUndefined();
  });
});
