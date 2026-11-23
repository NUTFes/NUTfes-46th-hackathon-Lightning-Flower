"use client";

import { Link } from "@chakra-ui/react";
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
    key: "number",
    header: "管理番号",
    width: "7rem",
    render: (report) => (
      <span className={styles.number}>{report.displayNumber}</span>
    ),
  },
  {
    key: "createdAt",
    header: "受付日時",
    render: (report) => (
      <span className={styles.nowrap}>{formatItemDate(report.createdAt)}</span>
    ),
  },
  {
    key: "category",
    header: "カテゴリ",
    render: (report) => report.category.name,
  },
  {
    key: "color",
    header: "色",
    render: (report) => <ColorLabel color={report.color} />,
  },
  {
    key: "brand",
    header: "ブランド",
    render: (report) => report.brand ?? <span className={styles.muted}>—</span>,
  },
  {
    key: "lostPlace",
    header: "なくした場所",
    render: (report) => report.lostPlace,
  },
  {
    key: "status",
    header: "ステータス",
    render: (report) => (
      <span className={styles.stack}>
        <StatusBadge kind="lost" status={report.status} />
        <AwaitingReplyBadge awaiting={report.awaitingReply} />
      </span>
    ),
  },
  {
    key: "match",
    header: "紐づく拾得物",
    render: (report) =>
      report.activeMatch ? (
        <Link asChild onClick={(event) => event.stopPropagation()}>
          <NextLink
            href={`/admin/found-items/${report.activeMatch.foundItemId}`}
          >
            {report.activeMatch.displayNumber}
          </NextLink>
        </Link>
      ) : (
        <span className={styles.muted}>—</span>
      ),
  },
];

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
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(report) => report.id}
      rowHref={(report) => `/admin/lost-reports/${report.id}`}
      selectable={selectable}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      emptyState={emptyState ?? "遺失物申請はありません"}
    />
  );
}
