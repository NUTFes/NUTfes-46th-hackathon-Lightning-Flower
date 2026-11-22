import { describe, expect, it } from "vitest";
import {
  ChatThreadListQuery,
  MessageBroadcast,
  MessageCreate,
  MessageListQuery,
} from "./message";

const id = "22222222-2222-4222-8222-222222222222";

describe("MessageCreate", () => {
  it("前後の空白を除く", () => {
    expect(MessageCreate.parse({ body: "  ありがとうございます\n" })).toEqual({
      body: "ありがとうございます",
    });
  });

  it.each([[""], [" \n　"], ["あ".repeat(1001)]])(
    "空・空白だけ・1000 文字を超える本文は受けない（%#）",
    (body) => {
      expect(MessageCreate.safeParse({ body }).success).toBe(false);
    },
  );

  it("1000 文字までは受ける", () => {
    expect(MessageCreate.safeParse({ body: "あ".repeat(1000) }).success).toBe(
      true,
    );
  });

  it("テキスト以外は受けない", () => {
    expect(MessageCreate.safeParse({ body: 1 }).success).toBe(false);
    expect(MessageCreate.safeParse({}).success).toBe(false);
  });
});

describe("MessageListQuery", () => {
  it("after は省略できる", () => {
    expect(MessageListQuery.parse({})).toEqual({});
  });

  it("after は日時だけ受ける", () => {
    expect(
      MessageListQuery.parse({ after: "2026-09-19T13:00:00 09:00" }),
    ).toEqual({ after: "2026-09-19T13:00:00+09:00" });
    expect(MessageListQuery.safeParse({ after: "yesterday" }).success).toBe(
      false,
    );
  });
});

describe("ChatThreadListQuery", () => {
  it("awaitingReply は true / false だけ", () => {
    expect(ChatThreadListQuery.parse({ awaitingReply: "true" })).toEqual({
      awaitingReply: true,
    });
    expect(ChatThreadListQuery.parse({})).toEqual({});
    expect(ChatThreadListQuery.safeParse({ awaitingReply: "1" }).success).toBe(
      false,
    );
  });
});

describe("MessageBroadcast", () => {
  it("lostReportIds か status のどちらかで宛先を指定する", () => {
    expect(
      MessageBroadcast.safeParse({ lostReportIds: [id], body: "お知らせ" })
        .success,
    ).toBe(true);
    expect(
      MessageBroadcast.safeParse({ status: "searching", body: "お知らせ" })
        .success,
    ).toBe(true);
  });

  it("両方・どちらもないときは受けない", () => {
    expect(
      MessageBroadcast.safeParse({
        lostReportIds: [id],
        status: "searching",
        body: "お知らせ",
      }).success,
    ).toBe(false);
    expect(MessageBroadcast.safeParse({ body: "お知らせ" }).success).toBe(
      false,
    );
  });

  it("空の lostReportIds・uuid でない ID・ない status は受けない", () => {
    expect(
      MessageBroadcast.safeParse({ lostReportIds: [], body: "お知らせ" })
        .success,
    ).toBe(false);
    expect(
      MessageBroadcast.safeParse({ lostReportIds: ["1"], body: "お知らせ" })
        .success,
    ).toBe(false);
    expect(
      MessageBroadcast.safeParse({ status: "unknown", body: "お知らせ" })
        .success,
    ).toBe(false);
  });
});
