"use client";

import { Badge, Image, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/constants";
import type { FoundItemSummary } from "@/lib/types";
import { ColorLabel } from "../ColorLabel";
import { StatusBadge } from "../StatusBadge";
import { DataTable, type DataTableColumn } from "./DataTable";
import styles from "./AdminTables.module.css";

const columns: DataTableColumn<FoundItemSummary>[] = [
  {
    key: "number",
    header: "管理番号",
    width: "7rem",
    render: (item) => (
      <span className={styles.number}>{item.displayNumber}</span>
    ),
  },
  {
    key: "photo",
    header: "写真",
    width: "4.5rem",
    render: (item) => {
      const photo = item.photos[0];
      return photo ? (
        <Image
          src={photo.thumbUrl || photo.url}
          alt={`${item.displayNumber} の写真`}
          className={styles.thumb}
        />
      ) : (
        <span className={styles.noThumb}>なし</span>
      );
    },
  },
  {
    key: "category",
    header: "カテゴリ",
    render: (item) => (
      <span className={styles.stack}>
        {item.category.name}
        {item.isValuable && (
          <Badge colorPalette="red" variant="outline" size="xs">
            貴重品
          </Badge>
        )}
      </span>
    ),
  },
  {
    key: "color",
    header: "色",
    render: (item) => <ColorLabel color={item.color} />,
  },
  {
    key: "brand",
    header: "ブランド",
    render: (item) => item.brand ?? <span className={styles.muted}>—</span>,
  },
  {
    key: "foundPlace",
    header: "拾った場所",
    render: (item) => item.foundPlace,
  },
  {
    key: "foundAt",
    header: "拾った時刻",
    render: (item) => (
      <span className={styles.nowrap}>{formatDateTime(item.foundAt)}</span>
    ),
  },
  {
    key: "registeredBy",
    header: "登録した実行委員",
    render: (item) => (
      <span className={styles.email}>{item.registeredByEmail}</span>
    ),
  },
  {
    key: "status",
    header: "ステータス",
    render: (item) => <StatusBadge kind="found" status={item.status} />,
  },
  {
    key: "match",
    header: "紐づく申請",
    render: (item) =>
      item.activeMatch ? (
        <Link asChild onClick={(event) => event.stopPropagation()}>
          <NextLink
            href={`/admin/lost-reports/${item.activeMatch.lostReportId}`}
          >
            {item.activeMatch.displayNumber}
          </NextLink>
        </Link>
      ) : (
        <span className={styles.muted}>—</span>
      ),
  },
];

// 拾得物の一覧の表（A02 と A07 で共通）。行を押すと拾得物詳細（A03）を開く
export function FoundItemTable({
  rows,
  selectable,
  selectedIds,
  onSelectionChange,
  emptyState,
}: {
  rows: FoundItemSummary[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(item) => item.id}
      rowHref={(item) => `/admin/found-items/${item.id}`}
      selectable={selectable}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      emptyState={emptyState ?? "拾得物はありません"}
    />
  );
}
