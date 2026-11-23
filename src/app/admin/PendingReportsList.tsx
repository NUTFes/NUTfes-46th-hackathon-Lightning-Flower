"use client";

import { Button, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import styles from "@/components/AdminTables.module.css";
import { BadgePill, type BadgeLabel } from "@/components/BadgePill";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { formatItemDate } from "@/components/DetailList";
import { itemColorLabels } from "@/components/FoundItemDetailFields";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { Category } from "@/lib/schemas/category";

export type PendingReason = "awaiting_reply" | "verifying" | "searching";

export type PendingReportRow = {
  reportId: string;
  number: string;
  category: Pick<Category, "id" | "name">;
  reason: PendingReason;
  color?: FoundItem["color"];
  pendingAt?: string;
};

const REASONS: Record<PendingReason, BadgeLabel> = {
  awaiting_reply: { label: "返信待ち", tone: "danger" },
  verifying: { label: "本人確認中", tone: "warning" },
  searching: { label: "未照合", tone: "info" },
};

const columns: DataTableColumn<PendingReportRow>[] = [
  {
    key: "number",
    header: "申請番号 / 日時",
    width: "8rem",
    render: (row) => (
      <Stack gap="0">
        <span className={styles.number}>{row.number}</span>
        {row.pendingAt && (
          <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
            {row.reason === "awaiting_reply" ? "最終メッセージ" : "受付"}{" "}
            {formatItemDate(row.pendingAt)}
          </Text>
        )}
      </Stack>
    ),
  },
  {
    key: "category",
    header: "申請内容",
    render: (row) =>
      row.color
        ? `${itemColorLabels[row.color]}の${row.category.name}`
        : row.category.name,
  },
  {
    key: "reason",
    header: "対応",
    width: "8rem",
    render: (row) => <BadgePill {...REASONS[row.reason]} />,
  },
  {
    key: "action",
    header: "操作",
    width: "112px",
    render: (row) => {
      const label = row.reason === "awaiting_reply" ? "返信する" : "詳しく見る";
      return (
        <Button asChild size="xs" w="24" variant="outline" colorPalette="blue">
          <NextLink
            href={hrefOf(row)}
            aria-label={`${row.number} ${label}`}
            onClick={(event) => event.stopPropagation()}
          >
            {label}
          </NextLink>
        </Button>
      );
    },
  },
];

// 返信待ちはチャットへ、それ以外は照合画面へ
function hrefOf(row: PendingReportRow) {
  return row.reason === "awaiting_reply"
    ? `/admin/chats/${row.reportId}`
    : `/admin/lost-reports/${row.reportId}`;
}

// ダッシュボード（A01）の「対応が必要な申請」
export function PendingReportsList({ rows }: { rows: PendingReportRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.reportId}
      rowHref={hrefOf}
      emptyState="対応が必要な申請はありません"
    />
  );
}
