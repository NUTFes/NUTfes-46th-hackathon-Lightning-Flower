"use client";

import styles from "@/components/AdminTables.module.css";
import { BadgePill, type BadgeLabel } from "@/components/BadgePill";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import type { Category } from "@/lib/schemas/category";

export type PendingReason = "awaiting_reply" | "verifying" | "searching";

export type PendingReportRow = {
  reportId: string;
  number: string;
  category: Pick<Category, "id" | "name">;
  reason: PendingReason;
};

const REASONS: Record<PendingReason, BadgeLabel> = {
  awaiting_reply: { label: "返信待ち", tone: "danger" },
  verifying: { label: "本人確認中", tone: "warning" },
  searching: { label: "未照合", tone: "info" },
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
    render: (row) => <BadgePill {...REASONS[row.reason]} />,
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
