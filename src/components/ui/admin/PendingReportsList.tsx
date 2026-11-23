"use client";

import { Badge } from "@chakra-ui/react";
import type { CategoryRef } from "@/lib/schemas/common";
import type { z } from "zod";
import { DataTable, type DataTableColumn } from "./DataTable";
import styles from "./AdminTables.module.css";

export type PendingReason = "awaiting_reply" | "verifying" | "searching";

export type PendingReportRow = {
  reportId: string;
  number: string;
  category: z.infer<typeof CategoryRef>;
  reason: PendingReason;
};

const REASONS: Record<PendingReason, { label: string; palette: string }> = {
  awaiting_reply: { label: "返信待ち", palette: "red" },
  verifying: { label: "本人確認中", palette: "orange" },
  searching: { label: "未照合", palette: "blue" },
};

const columns: DataTableColumn<PendingReportRow>[] = [
  {
    key: "number",
    header: "管理番号",
    width: "8rem",
    render: (row) => <span className={styles.number}>{row.number}</span>,
  },
  {
    key: "category",
    header: "カテゴリ",
    render: (row) => row.category.name,
  },
  {
    key: "reason",
    header: "対応",
    width: "8rem",
    render: (row) => (
      <Badge colorPalette={REASONS[row.reason].palette} variant="subtle">
        {REASONS[row.reason].label}
      </Badge>
    ),
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
