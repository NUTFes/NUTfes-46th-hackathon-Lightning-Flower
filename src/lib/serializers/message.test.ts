import { describe, expect, it } from "vitest";
import { ChatThread, Message } from "@/lib/schemas/message";
import { toChatThread, toMessage } from "./message";

describe("toMessage", () => {
  it("API の Message の形にし、送った人のメールを入れない", () => {
    const message = toMessage({
      id: "33333333-3333-4333-8333-333333333333",
      senderRole: "admin",
      body: "見つかったかもしれません",
      createdAt: new Date("2026-09-19T05:00:00.000Z"),
      // DB の行にメールが付いていても返さない
      ...{ senderEmail: "staff@example.com" },
    });
    expect(Message.parse(message)).toEqual(message);
    expect(message).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      senderRole: "admin",
      body: "見つかったかもしれません",
      createdAt: "2026-09-19T05:00:00.000Z",
    });
  });
});

describe("toChatThread", () => {
  const row = {
    lostReportId: "22222222-2222-4222-8222-222222222222",
    number: 118,
    category: { id: 6, name: "電気製品類" },
    color: "navy" as const,
    status: "maybe_found" as const,
    lastMessageAt: new Date("2026-09-19T05:00:00.000Z"),
    lastSenderRole: "guest" as const,
  };

  it("API の ChatThread の形にする", () => {
    const thread = toChatThread(row);
    expect(ChatThread.parse(thread)).toEqual(thread);
    expect(thread).toEqual({
      lostReportId: "22222222-2222-4222-8222-222222222222",
      displayNumber: "申-00118",
      category: { id: 6, name: "電気製品類" },
      color: "navy",
      status: "maybe_found",
      lastMessageAt: "2026-09-19T05:00:00.000Z",
      awaitingReply: true,
    });
  });

  it("最新のメッセージが admin なら返信待ちではない", () => {
    expect(
      toChatThread({ ...row, lastSenderRole: "admin" }).awaitingReply,
    ).toBe(false);
  });
});
