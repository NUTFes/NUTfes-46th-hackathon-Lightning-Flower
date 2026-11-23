"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Link,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgePill } from "@/components/BadgePill";
import type { ChatMessage } from "@/components/ChatBubble";
import { ChatPanel } from "@/components/ChatPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { ENDED_LOST_STATUSES } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { PICKUP_METHOD_LABELS } from "@/lib/constants";
import type { LostReportForAdmin } from "@/lib/schemas/lost-report";
import type { Message, MessageList } from "@/lib/schemas/message";
import {
  CHAT_POLL_INTERVAL_MS,
  mergeMessages,
  pollAfterOf,
  reportTitleOf,
} from "../chat-utils";
import { useRefreshThreads } from "../ThreadsContext";

type Loaded =
  | { state: "loading" }
  | { state: "ok"; report: LostReportForAdmin; messages: ChatMessage[] }
  | { state: "error"; status?: number; message: string };

// A06 の右側（1 つの申請のチャットと本人確認）。申請が変わったら作り直す（page で key を付ける）
export function ChatRoom({ reportId }: { reportId: string }) {
  const refreshThreads = useRefreshThreads();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [pollError, setPollError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  // ポーリングの after に使う、手元にある最新のメッセージの時刻
  const latestAt = useRef<string | undefined>(undefined);

  const base = `/api/lost-reports/${encodeURIComponent(reportId)}`;

  const applyMessages = useCallback((incoming: readonly ChatMessage[]) => {
    setLoaded((prev) => {
      if (prev.state !== "ok") return prev;
      const messages = mergeMessages(prev.messages, incoming);
      latestAt.current = messages.at(-1)?.createdAt;
      return { ...prev, messages };
    });
  }, []);

  const applyReport = useCallback((report: LostReportForAdmin) => {
    setLoaded((prev) => (prev.state === "ok" ? { ...prev, report } : prev));
  }, []);

  // 最初に、申請とメッセージを全部取る
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetchApi<LostReportForAdmin>(base, { signal }),
      fetchApi<MessageList>(`${base}/messages`, { signal }),
    ])
      .then(([report, { items }]) => {
        latestAt.current = items.at(-1)?.createdAt;
        setLoaded({ state: "ok", report, messages: items });
        setPollError(null);
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        setLoaded({
          state: "error",
          status: error instanceof FetchApiError ? error.status : undefined,
          message: errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [base, reloadCount]);

  // 開いている間、30 秒ごとに新しいメッセージと申請の状態を取り直す
  // （guest が受け取り方法を選ぶと「受け渡し待ち」になるので、申請も取り直す）
  const ready = loaded.state === "ok";
  useEffect(() => {
    if (!ready) return;
    let controller: AbortController | undefined;
    const timer = setInterval(() => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      const after = latestAt.current;
      const query = after
        ? `?${new URLSearchParams({ after: pollAfterOf(after) })}`
        : "";
      Promise.all([
        fetchApi<MessageList>(`${base}/messages${query}`, { signal }),
        fetchApi<LostReportForAdmin>(base, { signal }),
      ])
        .then(([{ items }, report]) => {
          if (signal.aborted) return;
          applyMessages(items);
          applyReport(report);
          setPollError(null);
        })
        .catch((error: unknown) => {
          if (signal.aborted) return;
          setPollError(errorMessageOf(error));
        });
    }, CHAT_POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      controller?.abort();
    };
  }, [ready, base, applyMessages, applyReport]);

  const send = useCallback(
    async (_reportId: string, body: string): Promise<ActionResult<Message>> => {
      try {
        const message = await fetchApi<Message>(`${base}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        });
        applyMessages([message]);
        refreshThreads();
        return { ok: true, data: message };
      } catch (error) {
        return { ok: false, error: errorMessageOf(error) };
      }
    },
    [base, applyMessages, refreshThreads],
  );

  // 本人確認・解除。成功したら、返ってきた申請で表示を合わせる
  const runReportAction = useCallback(
    async (path: string, method: "POST" | "DELETE"): Promise<ActionResult> => {
      try {
        const report = await fetchApi<LostReportForAdmin>(path, { method });
        applyReport(report);
        refreshThreads();
        return { ok: true };
      } catch (error) {
        // 409 などで失敗したときは、今の状態に合わせるため取り直しておく
        fetchApi<LostReportForAdmin>(base)
          .then(applyReport)
          .catch(() => {});
        return { ok: false, error: errorMessageOf(error) };
      }
    },
    [base, applyReport, refreshThreads],
  );

  if (loaded.state === "loading") {
    return (
      <Stack h="full" gap="3" aria-busy>
        <Skeleton h="140px" rounded="8px" />
        <Skeleton flex="1" rounded="8px" />
      </Stack>
    );
  }

  if (loaded.state === "error") {
    if (loaded.status === 404 || loaded.status === 400) {
      return (
        <EmptyState
          title="申請が見つかりません"
          description="左の一覧からチャットを選んでください。"
        />
      );
    }
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>チャットを読み込めませんでした</Alert.Title>
          <Alert.Description>{loaded.message}</Alert.Description>
        </Alert.Content>
        <Button
          size="xs"
          variant="outline"
          alignSelf="center"
          onClick={() => {
            setLoaded({ state: "loading" });
            setReloadCount((count) => count + 1);
          }}
        >
          再読み込み
        </Button>
      </Alert.Root>
    );
  }

  const { report, messages } = loaded;

  return (
    <Box h="full">
      <ChatPanel
        reportId={report.id}
        viewer="admin"
        initialMessages={messages}
        // admin は終わった申請にも送れる（警察へ移管したことを伝えるなど。API と同じ）
        canSend
        sendAction={send}
        header={
          <ChatHeader
            report={report}
            pollError={pollError}
            onVerify={() => runReportAction(`${base}/verify`, "POST")}
            onRelease={(foundItemId) =>
              runReportAction(
                `${base}/matches/${encodeURIComponent(foundItemId)}`,
                "DELETE",
              )
            }
          />
        }
      />
    </Box>
  );
}

function ChatHeader({
  report,
  pollError,
  onVerify,
  onRelease,
}: {
  report: LostReportForAdmin;
  pollError: string | null;
  onVerify: () => Promise<ActionResult>;
  onRelease: (foundItemId: string) => Promise<ActionResult>;
}) {
  const match = report.activeMatch;
  // ボタンを押せるかは画面で決める（API も今の状態でなければ 409 を返す）
  const maybeFound = report.status === "maybe_found" && match !== null;
  const canVerify = maybeFound && !report.verified;
  const canRelease = maybeFound;

  return (
    <Stack gap="3" px="5" py="4">
      <Flex align="start" justify="space-between" gap="4" wrap="wrap">
        <Stack gap="1" minW="0">
          <Flex align="center" gap="2" wrap="wrap">
            <Text fontSize="xs" color="fg.muted">
              {report.displayNumber}
            </Text>
            <StatusBadge kind="lost" status={report.status} />
            {report.verified && (
              <BadgePill label="本人確認 OK" tone="success" />
            )}
          </Flex>
          <Text fontSize="md" fontWeight="bold" overflowWrap="anywhere">
            {reportTitleOf(report)}
            {report.brand && (
              <Text as="span" fontWeight="normal" color="fg.muted" ms="2">
                {report.brand}
              </Text>
            )}
          </Text>
          <Text fontSize="sm" color="fg.muted" overflowWrap="anywhere">
            {report.guest.displayName ?? "（名前なし）"}・{report.guest.email}
          </Text>
        </Stack>
        <Link asChild fontSize="sm" color="blue.600" flexShrink={0}>
          <NextLink href={`/admin/lost-reports/${report.id}`}>
            申請の詳細・照合
          </NextLink>
        </Link>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        gap="3"
        wrap="wrap"
        bg="gray.50"
        rounded="8px"
        px="4"
        py="3"
      >
        <Stack gap="0.5" minW="0">
          <Text fontSize="sm" fontWeight="bold">
            本人確認
            {match && (
              <Text as="span" fontWeight="normal" ms="2">
                紐づいた拾得物：
                <Link asChild color="blue.600">
                  <NextLink href={`/admin/found-items/${match.foundItemId}`}>
                    {match.displayNumber}
                  </NextLink>
                </Link>
              </Text>
            )}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {verifyHintOf(report)}
          </Text>
        </Stack>
        <Flex gap="2" flexShrink={0}>
          <ConfirmDialog
            title="紐づけを解除しますか？"
            description="本人のものではなかったときに解除します。申請は「探し中」、拾得物は「受理」に戻ります。"
            confirmLabel="解除する"
            colorPalette="red"
            action={() =>
              match ? onRelease(match.foundItemId) : Promise.resolve(noMatch)
            }
            trigger={
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                disabled={!canRelease}
              >
                違った（解除）
              </Button>
            }
          />
          <ConfirmDialog
            title="受け取り方法を聞きますか？"
            description="本人確認 OK にします。参加者のチャットに、受け取り方法を選ぶボタンが出ます（選ぶと「受け渡し待ち」になります）。"
            confirmLabel="受け取り方法を聞く"
            colorPalette="blue"
            action={onVerify}
            trigger={
              <Button size="sm" colorPalette="blue" disabled={!canVerify}>
                受け取り方法を聞く
              </Button>
            }
          />
        </Flex>
      </Flex>

      {pollError && (
        <Text role="status" fontSize="xs" color="red.600">
          新しいメッセージを取得できませんでした。{pollError}
        </Text>
      )}
    </Stack>
  );
}

const noMatch: ActionResult = {
  ok: false,
  error: "紐づいた拾得物がありません。ページを読み込み直してください。",
};

function verifyHintOf(report: LostReportForAdmin) {
  if ((ENDED_LOST_STATUSES as readonly string[]).includes(report.status)) {
    return "この申請は終わっています。";
  }
  switch (report.status) {
    case "searching":
      return "まだ拾得物と紐づいていません。照合画面で紐づけると、本人確認ができます。";
    case "maybe_found":
      return report.verified
        ? "本人確認 OK。参加者が受け取り方法を選ぶのを待っています。"
        : "チャットで特徴を聞いて、本人のものか確かめてください。";
    case "awaiting_handover":
      return report.pickup
        ? `受け取り方法：${PICKUP_METHOD_LABELS[report.pickup.method]}${report.pickup.note ? `（${report.pickup.note}）` : ""}`
        : "受け渡し待ちです。";
    default:
      return "";
  }
}
