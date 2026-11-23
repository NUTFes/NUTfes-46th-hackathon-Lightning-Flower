import type { InferSelectModel } from "drizzle-orm";
import type { messages } from "@/db/schema";
import { formatLostNumber } from "@/lib/display-number";
import type { ChatThread, Message } from "@/lib/schemas/message";

// DB の messages の行を、API の Message にする（送った人のメールは返さない）
export type MessageRow = Pick<
  InferSelectModel<typeof messages>,
  "id" | "senderRole" | "body" | "createdAt"
>;

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    senderRole: row.senderRole,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/chats の 1 行（src/app/api/chats/route.ts で取ったもの）を、ChatThread にする
export type ChatThreadRow = {
  lostReportId: string;
  number: number;
  category: ChatThread["category"];
  color: ChatThread["color"];
  status: ChatThread["status"];
  lastMessageAt: Date;
  lastSenderRole: Message["senderRole"];
};

export function toChatThread(row: ChatThreadRow): ChatThread {
  return {
    lostReportId: row.lostReportId,
    displayNumber: formatLostNumber(row.number),
    category: row.category,
    color: row.color,
    status: row.status,
    lastMessageAt: row.lastMessageAt.toISOString(),
    awaitingReply: row.lastSenderRole === "guest",
  };
}
