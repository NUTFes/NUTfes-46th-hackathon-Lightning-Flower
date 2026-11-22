"use client";

import { Box, Flex } from "@chakra-ui/react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatMessage, ChatSenderRole } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";

type SendResult =
  { ok: true; message: ChatMessage } | { ok: false; error: string };

type ChatPanelProps = {
  reportId: string;
  header: ReactNode;
  initialMessages: readonly ChatMessage[];
  viewer: ChatSenderRole;
  canSend: boolean;
  sendAction: (reportId: string, body: string) => Promise<SendResult>;
  footerSlot?: ReactNode;
};

export function ChatPanel(props: ChatPanelProps) {
  return <ChatSession key={props.reportId} {...props} />;
}

function ChatSession({
  reportId,
  header,
  initialMessages,
  viewer,
  canSend,
  sendAction,
  footerSlot,
}: ChatPanelProps) {
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<ChatMessage>();
  const viewport = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);

  // 画面側からの更新を優先し、同じIDの送信結果は一度だけ表示する。
  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const message of [...sentMessages, ...initialMessages]) {
      byId.set(message.id, message);
    }
    const ordered = [...byId.values()].sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
    );
    return pendingMessage ? [...ordered, pendingMessage] : ordered;
  }, [initialMessages, pendingMessage, sentMessages]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element && followLatest.current)
      element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function send(body: string) {
    followLatest.current = true;
    setPendingMessage({
      id: "pending",
      senderRole: viewer,
      body,
      createdAt: new Date().toISOString(),
    });
    try {
      const result = await sendAction(reportId, body);
      if (!result.ok) throw new Error(result.error);
      setSentMessages((previous) => [...previous, result.message]);
    } finally {
      setPendingMessage(undefined);
    }
  }

  return (
    <Flex
      direction="column"
      w="full"
      h="full"
      minW="0"
      minH="0"
      bg={{ base: "#f2f5f9", md: "white" }}
      color="#0f172a"
      borderWidth={{ base: "0", md: "1px" }}
      borderColor="#e2e8f0"
      rounded={{ base: "none", md: "8px" }}
      overflow="hidden"
    >
      <Box
        bg="white"
        borderBottomWidth="1px"
        borderColor="#e2e8f0"
        flexShrink={0}
      >
        {header}
      </Box>
      <Box
        ref={viewport}
        flex="1"
        minH="0"
        overflowY="auto"
        px="18px"
        py="5"
        role="region"
        aria-label="チャット履歴"
        tabIndex={0}
        onScroll={(event) => {
          const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
          followLatest.current = scrollHeight - scrollTop - clientHeight <= 40;
        }}
      >
        <ChatMessageList messages={messages} viewer={viewer} />
        {footerSlot != null && <Box mt="5">{footerSlot}</Box>}
      </Box>
      <Box
        flexShrink={0}
        bg="white"
        borderTopWidth="1px"
        borderColor="#e2e8f0"
        p={{ base: "0", md: "4" }}
      >
        <ChatComposer onSend={send} disabled={!canSend} />
      </Box>
    </Flex>
  );
}
