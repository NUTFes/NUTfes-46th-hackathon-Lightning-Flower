import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { AwaitingReplyBadge } from "./AwaitingReplyBadge";
import { EmptyState } from "./EmptyState";

export type ChatThreadSummary = {
  reportId: string;
  reportNumber: string;
  title: string;
  awaitingReply: boolean;
};

type ChatThreadItemProps = {
  thread: ChatThreadSummary;
  href: string;
  selected?: boolean;
};

export function ChatThreadItem({
  thread,
  href,
  selected = false,
}: ChatThreadItemProps) {
  return (
    <Flex
      asChild
      align="center"
      gap="2"
      w="full"
      minW="0"
      p="4"
      rounded="8px"
      borderWidth="1px"
      borderColor={selected ? "#2563eb" : "#e2e8f0"}
      bg={selected ? "#eaf1fe" : "white"}
      _hover={{ borderColor: "#2563eb" }}
      fontFamily='"Noto Sans JP", sans-serif'
    >
      <Link href={href} aria-current={selected ? "page" : undefined}>
        <Stack flex="1" minW="0" gap="0.5" overflowWrap="anywhere">
          <Text fontSize="11px" lineHeight={1.4} color="#64748b">
            {thread.reportNumber}
          </Text>
          <Text
            fontSize="14px"
            lineHeight={1.6}
            fontWeight="bold"
            color="#0f172a"
          >
            {thread.title}
          </Text>
        </Stack>
        {thread.awaitingReply && (
          <Box flexShrink={0}>
            <AwaitingReplyBadge awaiting />
          </Box>
        )}
      </Link>
    </Flex>
  );
}

type ChatThreadListProps = {
  threads: readonly ChatThreadSummary[];
  activeReportId?: string;
  hrefBase: string;
  getThreadHref?: (reportId: string) => string;
};

export function ChatThreadList({
  threads,
  activeReportId,
  hrefBase,
  getThreadHref,
}: ChatThreadListProps) {
  if (threads.length === 0)
    return <EmptyState title="チャットはまだありません" />;

  const base = hrefBase.replace(/\/+$/, "");
  return (
    <Box as="nav" aria-label="チャットの一覧">
      <Stack as="ul" role="list" gap="2" listStyleType="none" p="0">
        {threads.map((thread) => (
          <Box as="li" key={thread.reportId}>
            <ChatThreadItem
              thread={thread}
              href={
                getThreadHref
                  ? getThreadHref(thread.reportId)
                  : `${base}/${encodeURIComponent(thread.reportId)}`
              }
              selected={thread.reportId === activeReportId}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
