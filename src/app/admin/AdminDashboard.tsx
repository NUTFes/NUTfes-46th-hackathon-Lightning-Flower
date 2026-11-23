"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { BadgePill } from "@/components/BadgePill";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import { AdminDashboard as AdminDashboardSchema } from "@/lib/schemas/admin";
import { LostReportForAdminList } from "@/lib/schemas/lost-report";
import { ChatThreadList } from "@/lib/schemas/message";
import {
  PendingReportsList,
  type PendingReportRow,
} from "./PendingReportsList";

const metrics = [
  { key: "foundItemCount", label: "拾得物数" },
  { key: "lostReportCount", label: "遺失物申請数" },
  { key: "awaitingReplyCount", label: "返信待ち" },
  { key: "resolvedCount", label: "解決済み" },
] as const;

const shortcuts = [
  {
    title: "拾得物の新規登録",
    label: "拾得物を登録する",
    href: "/staff/found-items/new",
  },
  {
    title: "最新の遺失物申請",
    label: "遺失物申請一覧を開く",
    href: "/admin/lost-reports",
  },
] as const;

async function loadMetrics(signal: AbortSignal) {
  return AdminDashboardSchema.parse(
    await fetchApi<unknown>("/api/admin/dashboard", { signal }),
  );
}

const PAGE_LIMIT = 100;

async function loadOldest<T>(
  path: string,
  parse: (data: unknown) => { items: T[]; total: number },
  signal: AbortSignal,
) {
  const loadPage = async (page: number) =>
    parse(
      await fetchApi<unknown>(`${path}&limit=${PAGE_LIMIT}&page=${page}`, {
        signal,
      }),
    );

  const first = await loadPage(1);
  if (first.total <= PAGE_LIMIT) return first;

  // API は新しい順。先頭ページの件数から末尾を求め、古い側の 100 件を取る。
  const lastPage = Math.ceil(first.total / PAGE_LIMIT);
  const last = await loadPage(lastPage);
  if (last.items.length === PAGE_LIMIT) return last;

  const previous = lastPage === 2 ? first : await loadPage(lastPage - 1);
  return {
    items: [...previous.items, ...last.items].slice(-PAGE_LIMIT),
    total: last.total,
  };
}

async function loadPendingRows(signal: AbortSignal) {
  const [threads, reports] = await Promise.all([
    loadOldest("/api/chats?awaitingReply=true", ChatThreadList.parse, signal),
    loadOldest(
      "/api/lost-reports?status=searching&awaitingReply=false",
      LostReportForAdminList.parse,
      signal,
    ),
  ]);

  // 更新と取得が重なった場合も、同じ申請は返信待ちの行だけを残す。
  const unique = new Map<string, PendingReportRow & { pendingAt: string }>();
  for (const report of reports.items) {
    unique.set(report.id, {
      reportId: report.id,
      number: report.displayNumber,
      category: report.category,
      color: report.color,
      reason: "searching",
      pendingAt: report.createdAt,
    });
  }
  for (const thread of threads.items) {
    unique.set(thread.lostReportId, {
      reportId: thread.lostReportId,
      number: thread.displayNumber,
      category: thread.category,
      color: thread.color,
      reason: "awaiting_reply",
      pendingAt: thread.lastMessageAt,
    });
  }
  const rows = [...unique.values()]
    .sort(
      (a, b) =>
        Date.parse(a.pendingAt) - Date.parse(b.pendingAt) ||
        a.number.localeCompare(b.number, "ja", { numeric: true }),
    )
    .slice(0, PAGE_LIMIT);
  const displayedReplies = rows.filter(
    (row) => row.reason === "awaiting_reply",
  ).length;
  return {
    rows,
    remainingReplies: Math.max(0, threads.total - displayedReplies),
    remainingReports: Math.max(
      0,
      reports.total - (rows.length - displayedReplies),
    ),
  };
}

type LoadState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

function useDashboardData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    load(signal).then(
      (data) => {
        if (!signal.aborted) setState({ status: "success", data });
      },
      (error: unknown) => {
        if (!signal.aborted) {
          setState({ status: "error", message: errorMessageOf(error) });
        }
      },
    );

    return () => controller.abort();
  }, [load, attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((previous) => previous + 1);
    },
  };
}

function LoadError({
  title,
  message,
  retry,
}: {
  title: string;
  message: string;
  retry: () => void;
}) {
  return (
    <Alert.Root status="error" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      <Button flexShrink={0} size="sm" variant="outline" onClick={retry}>
        再試行
      </Button>
    </Alert.Root>
  );
}

export function AdminDashboard() {
  const summary = useDashboardData(loadMetrics);
  const pending = useDashboardData(loadPendingRows);

  const counts = summary.state.status === "success" ? summary.state.data : null;

  return (
    <Stack as="main" minH="100dvh" mx="-8" p="8" bg="gray.50" gap="6">
      <Heading as="h1" size="2xl" color="gray.900">
        ダッシュボード
      </Heading>

      {summary.state.status === "error" ? (
        <LoadError
          title="集計を読み込めませんでした"
          message={summary.state.message}
          retry={summary.retry}
        />
      ) : (
        <SimpleGrid
          aria-label="集計"
          aria-busy={summary.state.status === "loading"}
          columns={{ base: 2, lg: 4 }}
          gap="4"
        >
          {counts
            ? metrics.map(({ key, label }) => (
                <StatCard key={key} label={label} value={counts[key]} />
              ))
            : metrics.map(({ key }) => (
                <Skeleton key={key} minH="86px" rounded="lg" />
              ))}
        </SimpleGrid>
      )}

      <Stack
        as="section"
        aria-labelledby="pending-reports-heading"
        aria-busy={pending.state.status === "loading"}
        minW="0"
        rounded="lg"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        p="5"
        gap="2"
      >
        <Flex align="center" justify="space-between" gap="2">
          <Heading id="pending-reports-heading" as="h2" size="md">
            対応が必要な申請
          </Heading>
          {counts && (
            <BadgePill
              label={`返信待ち ${counts.awaitingReplyCount.toLocaleString("ja-JP")}件`}
              tone="warning"
            />
          )}
        </Flex>
        {pending.state.status === "loading" && (
          <Text role="status" p="4" fontSize="sm" color="gray.600">
            対応が必要な申請を読み込み中です…
          </Text>
        )}
        {pending.state.status === "error" && (
          <LoadError
            title="対応が必要な申請を読み込めませんでした"
            message={pending.state.message}
            retry={pending.retry}
          />
        )}
        {pending.state.status === "success" && (
          <>
            <PendingReportsList rows={pending.state.data.rows} />
            {(pending.state.data.remainingReplies > 0 ||
              pending.state.data.remainingReports > 0) && (
              <Flex gap="4" wrap="wrap">
                {pending.state.data.remainingReplies > 0 && (
                  <Button asChild size="sm" variant="outline">
                    <NextLink href="/admin/chats">
                      ほか返信待ち{" "}
                      {pending.state.data.remainingReplies.toLocaleString(
                        "ja-JP",
                      )}
                      件 · チャット一覧
                    </NextLink>
                  </Button>
                )}
                {pending.state.data.remainingReports > 0 && (
                  <Button asChild size="sm" variant="outline">
                    <NextLink href="/admin/lost-reports">
                      ほか未照合{" "}
                      {pending.state.data.remainingReports.toLocaleString(
                        "ja-JP",
                      )}
                      件 · 遺失物申請一覧
                    </NextLink>
                  </Button>
                )}
              </Flex>
            )}
          </>
        )}
      </Stack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
        {shortcuts.map(({ title, label, href }) => (
          <Box
            key={href}
            as="section"
            rounded="lg"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            p="5"
          >
            <Heading as="h2" size="md" mb="3">
              {title}
            </Heading>
            <Button asChild w="full" colorPalette="blue">
              <NextLink href={href}>{label}</NextLink>
            </Button>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
