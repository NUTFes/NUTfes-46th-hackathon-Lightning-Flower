import { SENDER_ROLES } from "@/db/enums";
import {
  BooleanQuery,
  CategoryRef,
  DateTime,
  DateTimeQuery,
  ItemColor,
  LostStatus,
} from "./common";
import { z } from "./zod";

// チャット（Notion 設計仕様「API設計」の Message・MessageCreate・ChatThread）。
// 1 申請 = 1 スレッド。テキストのみ

export const SenderRole = z.enum(SENDER_ROLES).openapi("SenderRole");

// 送った人のメール（sender_email）は返さない（guest に staff のメールを見せないため）
export const Message = z
  .object({
    id: z.uuid(),
    senderRole: SenderRole,
    body: z.string(),
    createdAt: DateTime,
  })
  .openapi("Message");

export const MessageList = z
  .object({ items: z.array(Message) })
  .openapi("MessageList");

// GET /api/lost-reports/{id}/messages のクエリ
export const MessageListQuery = z.object({
  after: DateTimeQuery.optional().openapi({
    description:
      "この日時より後のメッセージだけ（省略すると全件）。取りこぼさないように、前回の最新より少し前（数秒）を渡し、画面側で id で重複を除く",
  }),
});

// 本文（1〜1000 文字）。前後の空白（改行も）を除いてから数える（空白だけのメッセージを送らせない）
export const MessageBody = z.string().trim().min(1).max(1000);

export const MessageCreate = z
  .object({ body: MessageBody })
  .openapi("MessageCreate");

// URL の [id]
export const LostReportIdParams = z.object({ id: z.uuid() });

// GET /api/chats の 1 件（admin）
export const ChatThread = z
  .object({
    lostReportId: z.uuid(),
    displayNumber: z.string().openapi({ example: "申-00118" }),
    // 申請の概要（画面で「紺のイヤホン」のように並べる）
    category: CategoryRef,
    color: ItemColor,
    status: LostStatus,
    lastMessageAt: DateTime,
    awaitingReply: z.boolean(), // 最新のメッセージが guest のもの
  })
  .openapi("ChatThread");

export const ChatThreadList = z
  .object({ items: z.array(ChatThread) })
  .openapi("ChatThreadList");

export const ChatThreadListQuery = z.object({
  awaitingReply: BooleanQuery.optional().openapi({
    type: "string",
    enum: ["true", "false"],
    description:
      "true なら返信待ちのスレッドだけ、false なら返信待ちでないものだけ",
  }),
});

// POST /api/messages/broadcast（admin）。宛先は lostReportIds か status のどちらか一方
export const MessageBroadcast = z
  .object({
    lostReportIds: z
      .array(z.uuid())
      .min(1)
      .max(1000)
      .optional()
      .openapi({ description: "宛先の申請の ID（status と一緒には使えない）" }),
    status: LostStatus.optional().openapi({
      description:
        "このステータスの申請すべてに送る（lostReportIds と一緒には使えない）",
    }),
    body: MessageBody,
  })
  .refine(
    (input) =>
      (input.lostReportIds === undefined) !== (input.status === undefined),
    { message: "lostReportIds か status のどちらか一方を指定してください" },
  )
  .openapi("MessageBroadcast");

export const MessageBroadcastResult = z
  .object({ sent: z.number().int() }) // 入れたメッセージの数（＝送った申請の数）
  .openapi("MessageBroadcastResult");

export type Message = z.infer<typeof Message>;
export type MessageList = z.infer<typeof MessageList>;
export type ChatThread = z.infer<typeof ChatThread>;
export type ChatThreadList = z.infer<typeof ChatThreadList>;
export type MessageBroadcastResult = z.infer<typeof MessageBroadcastResult>;
