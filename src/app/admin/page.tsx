"use client";

import {
  Alert,
  Badge,
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
import { AwaitingReplyBadge } from "@/components/AwaitingReplyBadge";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { formatItemDate } from "@/components/DetailList";
import { itemColorLabels } from "@/components/FoundItemDetailFields";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import { AdminDashboard } from "@/lib/schemas/admin";
import { LostReportForAdminList } from "@/lib/schemas/lost-report";
import { ChatThreadList, type ChatThread } from "@/lib/schemas/message";

type DashboardRow = Pick<
  ChatThread,
  "displayNumber" | "category" | "color" | "status" | "awaitingReply"
> & { id: string; receivedAt?: string };

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

const columns: DataTableColumn<DashboardRow>[] = [
  {
    key: "number",
    header: "受付 / 申請番号",
    width: "160px",
    render: (row) => (
      <Stack gap="0">
        <Text fontWeight="semibold">{row.displayNumber}</Text>
        {row.receivedAt && (
          <Text fontSize="xs" color="gray.600">
            {formatItemDate(row.receivedAt)}
          </Text>
        )}
      </Stack>
    ),
  },
  {
    key: "item",
    header: "申請内容",
    render: (row) => `${itemColorLabels[row.color]}の${row.category.name}`,
  },
  {
    key: "status",
    header: "ステータス",
    width: "140px",
    render: (row) =>
      row.awaitingReply ? (
        <AwaitingReplyBadge awaiting />
      ) : (
        <StatusBadge kind="lost" status={row.status} />
      ),
  },
  {
    key: "action",
    header: "操作",
    width: "112px",
    render: (row) => (
      <Button asChild size="xs" w="24" variant="outline" colorPalette="blue">
        <NextLink
          href={
            row.awaitingReply
              ? `/admin/chats/${row.id}`
              : `/admin/lost-reports/${row.id}`
          }
          aria-label={`${row.displayNumber} ${row.awaitingReply ? "返信する" : "詳しく見る"}`}
        >
          {row.awaitingReply ? "返信する" : "詳しく見る"}
        </NextLink>
      </Button>
    ),
  },
];

async function loadMetrics(signal: AbortSignal) {
  return AdminDashboard.parse(
    await fetchApi<unknown>("/api/admin/dashboard", { signal }),
  );
}

async function loadPendingRows(signal: AbortSignal): Promise<DashboardRow[]> {
  const [threads, reports] = await Promise.all([
    fetchApi<unknown>("/api/chats?awaitingReply=true", { signal }).then(
      (data) => ChatThreadList.parse(data),
    ),
    fetchApi<unknown>("/api/lost-reports?status=searching", { signal }).then(
      (data) => LostReportForAdminList.parse(data),
    ),
  ]);
  const reportsById = new Map(
    reports.items.map((report) => [report.id, report]),
  );
  const threadIds = new Set(threads.items.map((thread) => thread.lostReportId));

  // チャットの返信待ちを先に出し、同じ申請を探し中の一覧に重ねて表示しない。
  return [
    ...threads.items.map((thread) => ({
      ...thread,
      id: thread.lostReportId,
      receivedAt: reportsById.get(thread.lostReportId)?.createdAt,
    })),
    ...reports.items
      .filter((report) => !threadIds.has(report.id))
      .map((report) => ({ ...report, receivedAt: report.createdAt })),
  ];
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

export default function Page() {
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
            <Badge bg="orange.100" color="orange.700" fontWeight="bold">
              返信待ち {counts.awaitingReplyCount.toLocaleString("ja-JP")}件
            </Badge>
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
          <DataTable
            columns={columns}
            rows={pending.state.data}
            getRowId={(row) => row.id}
            emptyState="対応が必要な申請はありません"
          />
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
