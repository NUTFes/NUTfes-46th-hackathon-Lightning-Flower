"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_POLL_INTERVAL_MS,
  mergeMessages,
  pollAfterOf,
  reportTitleOf,
} from "@/app/admin/chats/chat-utils";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import type { ChatMessage } from "@/components/ChatBubble";
import { ChatPanel } from "@/components/ChatPanel";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ENDED_LOST_STATUSES } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { HQ_LOCATION } from "@/lib/constants";
import type { LostReport } from "@/lib/schemas/lost-report";
import type { Message, MessageList } from "@/lib/schemas/message";
import { pickupLabelOf } from "../pickup/pickup-label";

type Loaded =
  | { state: "loading" }
  | { state: "ok"; report: LostReport; messages: ChatMessage[] }
  | { state: "error"; status?: number; message: string };

// G06 チャットの本体。作りは A06（src/app/admin/chats/[lostReportId]/ChatRoom.tsx）と同じ：
// 最初に申請とメッセージを全部取り、開いている間は 30 秒ごとに after 付きで取り直す
export function GuestChat({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [pollError, setPollError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  // ポーリングの after に使う、手元にある最新のメッセージの時刻
  const latestAt = useRef<string | undefined>(undefined);

  const base = `/api/lost-reports/${encodeURIComponent(reportId)}`;
  const chatPath = `/lost-reports/${reportId}/chat`;

  // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(`/?${new URLSearchParams({ next: chatPath })}`);
        return true;
      }
      return false;
    },
    [router, chatPath],
  );

  const applyMessages = useCallback((incoming: readonly ChatMessage[]) => {
    setLoaded((prev) => {
      if (prev.state !== "ok") return prev;
      const messages = mergeMessages(prev.messages, incoming);
      latestAt.current = messages.at(-1)?.createdAt;
      return { ...prev, messages };
    });
  }, []);

  const applyReport = useCallback((report: LostReport) => {
    setLoaded((prev) => (prev.state === "ok" ? { ...prev, report } : prev));
  }, []);

  // 最初に、申請とメッセージを全部取る
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetchApi<LostReport>(base, { signal }),
      fetchApi<MessageList>(`${base}/messages`, { signal }),
    ])
      .then(([report, { items }]) => {
        latestAt.current = items.at(-1)?.createdAt;
        setLoaded({ state: "ok", report, messages: items });
        setPollError(null);
      })
      .catch((error: unknown) => {
        if (signal.aborted || handleUnauthorized(error)) return;
        setLoaded({
          state: "error",
          status: error instanceof FetchApiError ? error.status : undefined,
          message: errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [base, reloadCount, handleUnauthorized]);

  // 開いている間、30 秒ごとに新しいメッセージと申請の状態を取り直す
  // （本部が本人確認 OK にすると「受け取り方法を選ぶ」を出すので、申請も取り直す）。
  // タブが見えないときは取らず、見えるようになったらすぐ取る
  const ready = loaded.state === "ok";
  useEffect(() => {
    if (!ready) return;
    let controller: AbortController | undefined;
    function poll() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      const after = latestAt.current;
      const query = after
        ? `?${new URLSearchParams({ after: pollAfterOf(after) })}`
        : "";
      Promise.all([
        fetchApi<MessageList>(`${base}/messages${query}`, { signal }),
        fetchApi<LostReport>(base, { signal }),
      ])
        .then(([{ items }, report]) => {
          if (signal.aborted) return;
          applyMessages(items);
          applyReport(report);
          setPollError(null);
        })
        .catch((error: unknown) => {
          if (signal.aborted || handleUnauthorized(error)) return;
          setPollError(errorMessageOf(error));
        });
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") poll();
    }
    const timer = setInterval(poll, CHAT_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller?.abort();
    };
  }, [ready, base, applyMessages, applyReport, handleUnauthorized]);

  const send = useCallback(
    async (_reportId: string, body: string): Promise<ActionResult<Message>> => {
      try {
        const message = await fetchApi<Message>(`${base}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        });
        applyMessages([message]);
        return { ok: true, data: message };
      } catch (error) {
        if (handleUnauthorized(error)) return { ok: false, error: "" };
        if (error instanceof FetchApiError && error.status === 409) {
          // 申請が終わったなど。今の状態に合わせて、送れるかの表示を直す
          fetchApi<LostReport>(base)
            .then(applyReport)
            .catch(() => {});
          return {
            ok: false,
            error:
              "今は送れません。申請が終わったか、本部からのメッセージがまだ届いていません。",
          };
        }
        return { ok: false, error: errorMessageOf(error) };
      }
    },
    [base, applyMessages, applyReport, handleUnauthorized],
  );

  if (loaded.state === "loading") {
    return (
      <Stack h="full" gap="3" p="4" aria-busy>
        <Skeleton h="48px" rounded="8px" />
        <Skeleton flex="1" rounded="8px" />
      </Stack>
    );
  }

  if (loaded.state === "error") {
    if (loaded.status === 404 || loaded.status === 400) {
      return (
        <Box p="4">
          <EmptyState
            title="申請が見つかりません"
            description="ホームの「自分の申請」から開き直してください。"
          />
        </Box>
      );
    }
    return (
      <Box p="4">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>チャットを読み込めませんでした</Alert.Title>
            <Alert.Description>{loaded.message}</Alert.Description>
            <Box mt="2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLoaded({ state: "loading" });
                  setReloadCount((count) => count + 1);
                }}
              >
                もう一度読み込む
              </Button>
            </Box>
          </Alert.Content>
        </Alert.Root>
      </Box>
    );
  }

  const { report, messages } = loaded;
  const ended = (ENDED_LOST_STATUSES as readonly string[]).includes(
    report.status,
  );
  const hasAdminMessage = messages.some(
    (message) => message.senderRole === "admin",
  );
  // API と同じ条件（本部から 1 通以上届いていて、終わっていない申請）。違えば API は 409 を返す
  const canSend = hasAdminMessage && !ended;
  // 本部が本人確認 OK にして、まだ受け取り方法を選んでいないときだけ出す（API も同じ条件で受け付ける）
  const canChoosePickup =
    report.verified && report.status === "maybe_found" && !report.pickup;

  return (
    // ChatBubble の「（自分）」の読み上げ用の文字（VisuallyHidden）は position: absolute で、
    // 包む要素がないとスクロールの外まで伸びてページに縦のスクロールが出るので、ここで閉じ込める
    <Box h="full" position="relative" overflow="hidden">
      <ChatPanel
        reportId={report.id}
        viewer="guest"
        initialMessages={messages}
        canSend={canSend}
        sendAction={send}
        header={<ChatContextBar report={report} pollError={pollError} />}
        footerSlot={
          <ChatFooter
            reportId={report.id}
            canChoosePickup={canChoosePickup}
            pickup={report.pickup}
            hint={sendHintOf({ ended, hasAdminMessage })}
          />
        }
      />
    </Box>
  );
}

// 申請の番号・概要・状態（Figma の ChatContextBar）
function ChatContextBar({
  report,
  pollError,
}: {
  report: LostReport;
  pollError: string | null;
}) {
  return (
    <Stack gap="1" px="5" py="3">
      <Flex align="center" justify="space-between" gap="3">
        <Text fontSize="sm" fontWeight="bold" minW="0" overflowWrap="anywhere">
          {report.displayNumber} {reportTitleOf(report)}
        </Text>
        <Box flexShrink={0}>
          <StatusBadge kind="lost" status={report.status} />
        </Box>
      </Flex>
      {pollError && (
        <Text role="status" fontSize="xs" color="red.600">
          新しいメッセージを取得できませんでした。{pollError}
        </Text>
      )}
    </Stack>
  );
}

function ChatFooter({
  reportId,
  canChoosePickup,
  pickup,
  hint,
}: {
  reportId: string;
  canChoosePickup: boolean;
  pickup: LostReport["pickup"];
  hint: string | null;
}) {
  if (!canChoosePickup && !pickup && !hint) return null;
  return (
    <Stack gap="3">
      {pickup && (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="lg"
          px="4"
          py="3"
        >
          <Text fontSize="xs" color="gray.600">
            選んだ受け取り方法（受け取り場所：本部・{HQ_LOCATION.name}）
          </Text>
          <Text fontSize="sm" fontWeight="bold" overflowWrap="anywhere">
            {pickupLabelOf(pickup)}
          </Text>
        </Box>
      )}
      {canChoosePickup && (
        <Button asChild colorPalette="blue" size="lg" w="full">
          <NextLink href={`/lost-reports/${reportId}/pickup`}>
            受け取り方法を選ぶ
          </NextLink>
        </Button>
      )}
      {hint && (
        <Text fontSize="xs" color="gray.600" textAlign="center">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

function sendHintOf({
  ended,
  hasAdminMessage,
}: {
  ended: boolean;
  hasAdminMessage: boolean;
}) {
  if (ended) return "この申請は終わっているので、メッセージは送れません。";
  if (!hasAdminMessage)
    return "本部からメッセージが届くと、返信できるようになります。";
  return null;
}
