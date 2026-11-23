import { chakra, Flex, Stack, Text, VisuallyHidden } from "@chakra-ui/react";
import type { SENDER_ROLES } from "@/db/enums";

export type ChatSenderRole = (typeof SENDER_ROLES)[number];

export type ChatMessage = {
  id: string;
  senderRole: ChatSenderRole;
  body: string;
  createdAt: string;
};

type ChatBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  senderLabel: string;
};

const timeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function ChatBubble({ message, isOwn, senderLabel }: ChatBubbleProps) {
  const date = new Date(message.createdAt);
  const time = Number.isFinite(date.getTime()) ? timeFormat.format(date) : null;

  return (
    <Flex
      direction={isOwn ? "row-reverse" : "row"}
      align="end"
      gap="1"
      w="full"
      minW="0"
      fontFamily='"Noto Sans JP", sans-serif'
    >
      <Stack
        minW="0"
        maxW="300px"
        gap="1"
        px="4"
        py="3"
        borderWidth="1px"
        borderColor={isOwn ? "#dbe7fd" : "#e2e8f0"}
        bg={isOwn ? "#eaf1fe" : "white"}
        rounded="12px"
      >
        {isOwn ? (
          <VisuallyHidden>{senderLabel}（自分）</VisuallyHidden>
        ) : (
          <Text
            fontSize="11px"
            lineHeight={1.4}
            fontWeight="bold"
            color="#2563eb"
          >
            {senderLabel}
          </Text>
        )}
        <Text
          color="#0f172a"
          fontSize="14px"
          lineHeight={1.6}
          whiteSpace="pre-wrap"
          overflowWrap="anywhere"
        >
          {message.body}
        </Text>
      </Stack>
      {time && (
        <chakra.time
          dateTime={message.createdAt}
          flexShrink={0}
          fontSize="11px"
          lineHeight={1.4}
          color="#64748b"
        >
          {time}
        </chakra.time>
      )}
    </Flex>
  );
}
