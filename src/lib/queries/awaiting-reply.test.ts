import { describe, expect, it } from "vitest";
import { ENDED_LOST_STATUSES } from "@/db/enums";
import { isAwaitingReply } from "./awaiting-reply";

describe("isAwaitingReply", () => {
  it("最新のメッセージが guest で、終わっていない申請は返信待ち", () => {
    expect(isAwaitingReply("guest", "searching")).toBe(true);
    expect(isAwaitingReply("guest", "maybe_found")).toBe(true);
  });

  it("最新のメッセージが admin か、メッセージがなければ返信待ちではない", () => {
    expect(isAwaitingReply("admin", "searching")).toBe(false);
    expect(isAwaitingReply(undefined, "searching")).toBe(false);
  });

  it.each(ENDED_LOST_STATUSES)(
    "終わった申請（%s）は、最新のメッセージが guest でも返信待ちではない",
    (status) => {
      expect(isAwaitingReply("guest", status)).toBe(false);
    },
  );
});
