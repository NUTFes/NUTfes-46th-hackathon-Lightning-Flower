"use client";

import { Box, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/AdminTables.module.css";
import { AwaitingReplyBadge } from "@/components/AwaitingReplyBadge";
import { ColorLabel } from "@/components/ColorLabel";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { formatItemDate } from "@/components/DetailList";
import { StatusBadge } from "@/components/StatusBadge";
import type { LostReportForAdmin } from "@/lib/schemas/lost-report";

const columns: DataTableColumn<LostReportForAdmin>[] = [
  {
    key: "receipt",
    header: "受付 / 申請番号",
    width: "176px",
    render: (report) => (
      <Stack gap="0">
        <span className={styles.number}>{report.displayNumber}</span>
        <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
          {formatItemDate(report.createdAt)}
        </Text>
      </Stack>
    ),
  },
  {
    key: "details",
    header: "申請内容",
    render: (report) => (
      <Stack gap="0" whiteSpace="normal" overflowWrap="anywhere">
        <span className={styles.stack}>
          <strong>{report.category.name}</strong>
          <ColorLabel color={report.color} />
          {report.brand && (
            <Text as="span" minW="0" lineClamp="2">
              {report.brand}
            </Text>
          )}
        </span>
        <Text fontSize="xs" color="fg.muted" lineClamp="2">
          {report.lostPlace}
          {report.note && ` ／ ${report.note}`}
        </Text>
        {report.activeMatch && (
          <Link
            asChild
            fontSize="xs"
            onClick={(event) => event.stopPropagation()}
          >
            <NextLink
              href={`/admin/found-items/${report.activeMatch.foundItemId}`}
            >
              紐づく拾得物：{report.activeMatch.displayNumber}
            </NextLink>
          </Link>
        )}
      </Stack>
    ),
  },
  {
    key: "status",
    header: "ステータス",
    width: "156px",
    render: (report) => (
      <span className={styles.stack}>
        <StatusBadge kind="lost" status={report.status} />
        <AwaitingReplyBadge awaiting={report.awaitingReply} />
      </span>
    ),
  },
  {
    key: "action",
    header: "操作",
    width: "128px",
    render: (report) => (
      <Link
        asChild
        color="blue.700"
        onClick={(event) => event.stopPropagation()}
      >
        <NextLink
          href={reportHref(report)}
          aria-label={`${report.displayNumber}を照合する`}
        >
          照合する
        </NextLink>
      </Link>
    ),
  },
];

function reportHref(report: LostReportForAdmin) {
  return `/admin/lost-reports/${report.id}`;
}

// 遺失物申請の一覧の表（A04）。行を押すと照合画面（A05）を開く
export function LostReportTable({
  rows,
  selectable,
  selectedIds,
  onSelectionChange,
  emptyState,
}: {
  rows: LostReportForAdmin[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: ReactNode;
}) {
  return (
    <Box css={{ "& table": { tableLayout: "fixed", width: "100%" } }}>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(report) => report.id}
        rowHref={reportHref}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        emptyState={emptyState ?? "遺失物申請はありません"}
      />
    </Box>
  );
}
