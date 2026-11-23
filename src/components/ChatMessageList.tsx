import { Box, Stack, Text } from "@chakra-ui/react";
import {
  ChatBubble,
  type ChatMessage,
  type ChatSenderRole,
} from "./ChatBubble";

type ChatMessageListProps = {
  messages: readonly ChatMessage[];
  viewer: ChatSenderRole;
};

const senderLabels = { admin: "学園祭本部", guest: "参加者" } satisfies Record<
  ChatSenderRole,
  string
>;

export function ChatMessageList({ messages, viewer }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <Text color="#64748b" fontSize="sm" textAlign="center" py="6">
        まだメッセージがありません。
      </Text>
    );
  }

  return (
    <Stack
      as="ol"
      role="list"
      gap="5"
      listStyleType="none"
      p="0"
      aria-label="メッセージ一覧"
    >
      {messages.map((message) => (
        <Box as="li" key={message.id} minW="0">
          <ChatBubble
            message={message}
            isOwn={message.senderRole === viewer}
            senderLabel={senderLabels[message.senderRole]}
          />
        </Box>
      ))}
    </Stack>
  );
}
