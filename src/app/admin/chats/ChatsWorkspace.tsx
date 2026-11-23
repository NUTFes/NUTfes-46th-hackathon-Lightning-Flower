"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ChatThreadList,
  type ChatThreadSummary,
} from "@/components/ChatThreadList";
import { EmptyState } from "@/components/EmptyState";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import type {
  ChatThread,
  ChatThreadList as ChatThreadListBody,
} from "@/lib/schemas/message";
import { CHAT_POLL_INTERVAL_MS, reportTitleOf } from "./chat-utils";
import { ThreadsRefreshContext } from "./ThreadsContext";

const PAGE_SIZE = 50;

// 絞り込み（URL の ?filter=awaiting）。スレッドを開いても絞り込みを残すため、リンクにも付ける
const FILTERS = [
  { value: "all", label: "すべて" },
  { value: "awaiting", label: "返信待ち" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

function filterQueryOf(filter: Filter) {
  return filter === "awaiting" ? "?filter=awaiting" : "";
}

function chatsPathOf(filter: Filter, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (filter === "awaiting") params.set("awaitingReply", "true");
  return `/api/chats?${params}`;
}

function toSummary(thread: ChatThread): ChatThreadSummary {
  return {
    reportId: thread.lostReportId,
    reportNumber: thread.displayNumber,
    title: reportTitleOf(thread),
    awaitingReply: thread.awaitingReply,
  };
}

// 一覧の結果。key は、どの絞り込み・何ページ分で取った結果かを表す（変わったら古い結果を出さない）
type Result =
  | { key: string; state: "ok"; items: ChatThread[]; total: number }
  | { key: string; state: "error"; message: string };

// A06 チャット・本人確認の左側（スレッドの一覧）。右側（children）を切り替えても、一覧は作り直さない
export function ChatsWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lostReportId } = useParams<{ lostReportId?: string }>();
  const filter: Filter =
    searchParams.get("filter") === "awaiting" ? "awaiting" : "all";

  const [pages, setPages] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const key = JSON.stringify([filter, pages]);
  const current = result?.key === key ? result : null;

  // 取り直す（30 秒ごと・右側で送ったあとなど）。取っている間も、今の一覧は出したままにする
  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const [currentFilter, currentPages] = JSON.parse(key) as [Filter, number];
    // 開いているページ数分を、まとめて取り直す（途中で増えた分は、id で重なりを除く）
    Promise.all(
      Array.from({ length: currentPages }, (_, index) =>
        fetchApi<ChatThreadListBody>(chatsPathOf(currentFilter, index + 1), {
          signal: controller.signal,
        }),
      ),
    )
      .then((bodies) => {
        const seen = new Set<string>();
        const items = bodies
          .flatMap((body) => body.items)
          .filter((item) => {
            if (seen.has(item.lostReportId)) return false;
            seen.add(item.lostReportId);
            return true;
          });
        setResult({
          key,
          state: "ok",
          items,
          total: bodies.at(-1)?.total ?? 0,
        });
        setRefreshError(null);
        setLoadingMore(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadingMore(false);
        // すでに一覧が出ているときは消さずに、取り直せなかったことだけ出す
        setResult((prev) =>
          prev?.key === key && prev.state === "ok"
            ? prev
            : { key, state: "error", message: errorMessageOf(error) },
        );
        setRefreshError(errorMessageOf(error));
      });
    return () => controller.abort();
  }, [key, reloadCount]);

  // 30 秒ごとに取り直す（返信待ちが増えたことに気づけるように）
  useEffect(() => {
    const timer = setInterval(refresh, CHAT_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  function changeFilter(next: Filter) {
    if (next === filter) return;
    setPages(1);
    router.replace(`${pathname}${filterQueryOf(next)}`, { scroll: false });
  }

  function loadMore() {
    setLoadingMore(true);
    setPages((count) => count + 1);
  }

  // 「もっと見る」で増やした分は、取り終わるまで今の一覧を出しておく
  const shown =
    current ?? (loadingMore && result?.state === "ok" ? result : null);

  return (
    <ThreadsRefreshContext.Provider value={refresh}>
      <Flex direction="column" h="100dvh" py="6" gap="4" minW="0">
        <Heading as="h1" size="lg" flexShrink={0}>
          チャット・本人確認
        </Heading>
        <Flex flex="1" minH="0" gap="5" align="stretch">
          <Flex
            as="section"
            aria-label="スレッド"
            direction="column"
            w="320px"
            flexShrink={0}
            minH="0"
            gap="3"
          >
            <Flex role="group" aria-label="絞り込み" gap="2" flexShrink={0}>
              {FILTERS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  rounded="full"
                  variant={filter === option.value ? "solid" : "outline"}
                  colorPalette={filter === option.value ? "blue" : "gray"}
                  aria-pressed={filter === option.value}
                  onClick={() => changeFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </Flex>

            <Text
              fontSize="sm"
              color="fg.muted"
              flexShrink={0}
              aria-live="polite"
            >
              {shown?.state === "ok" ? `${shown.total}件` : " "}
            </Text>

            <Box flex="1" minH="0" overflowY="auto" aria-busy={!shown}>
              {!shown &&
                Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} h="73px" rounded="8px" mb="2" />
                ))}

              {shown?.state === "error" && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>一覧を読み込めませんでした</Alert.Title>
                    <Alert.Description>{shown.message}</Alert.Description>
                  </Alert.Content>
                  <Button
                    size="xs"
                    variant="outline"
                    alignSelf="center"
                    onClick={refresh}
                  >
                    再読み込み
                  </Button>
                </Alert.Root>
              )}

              {shown?.state === "ok" && (
                <Stack gap="3">
                  {refreshError && (
                    <Text role="status" fontSize="xs" color="red.600">
                      一覧を更新できませんでした。{refreshError}
                    </Text>
                  )}
                  {shown.items.length === 0 ? (
                    <EmptyState
                      title={
                        filter === "awaiting"
                          ? "返信待ちのチャットはありません"
                          : "チャットはまだありません"
                      }
                    />
                  ) : (
                    <ChatThreadList
                      threads={shown.items.map(toSummary)}
                      activeReportId={lostReportId}
                      hrefBase="/admin/chats"
                      getThreadHref={(id) =>
                        `/admin/chats/${encodeURIComponent(id)}${filterQueryOf(filter)}`
                      }
                    />
                  )}
                  {shown.items.length < shown.total && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={loadingMore}
                      onClick={loadMore}
                    >
                      もっと見る
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          </Flex>

          <Box as="section" aria-label="チャット" flex="1" minW="0" minH="0">
            {children}
          </Box>
        </Flex>
      </Flex>
    </ThreadsRefreshContext.Provider>
  );
}
