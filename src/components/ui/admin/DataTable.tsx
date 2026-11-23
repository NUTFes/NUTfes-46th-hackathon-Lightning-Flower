"use client";

import { Checkbox, Table } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./DataTable.module.css";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
};

// admin の一覧の表（Chakra の Table を包んだもの）。選択状態は親が持つ。
// columns に関数が入るので、Server Component から直接は渡せない。
// 列の定義は Client 側のラッパー（FoundItemTable・LostReportTable など）に持たせる
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  rowHref,
  selectable,
  selectedIds = [],
  onSelectionChange,
  emptyState,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: ReactNode;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        {emptyState ?? "該当するものはありません"}
      </div>
    );
  }

  const selected = new Set(selectedIds);
  const rowIds = rows.map(getRowId);
  const selectedCount = rowIds.filter((id) => selected.has(id)).length;
  const headerChecked =
    selectedCount === 0
      ? false
      : selectedCount === rowIds.length
        ? true
        : "indeterminate";

  function toggleRow(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange?.([...next]);
  }

  // 表に出ていない分（別のページなど）の選択は残す
  function toggleAll(checked: boolean) {
    const next = new Set(selected);
    for (const id of rowIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onSelectionChange?.([...next]);
  }

  function openRow(row: T) {
    if (rowHref) router.push(rowHref(row));
  }

  function onRowKeyDown(event: KeyboardEvent, row: T) {
    if (event.key === "Enter") openRow(row);
  }

  return (
    <Table.ScrollArea className={styles.wrapper}>
      <Table.Root size="sm" className={styles.table} interactive={!!rowHref}>
        <Table.Header>
          <Table.Row>
            {selectable && (
              <Table.ColumnHeader className={styles.checkCell}>
                <Checkbox.Root
                  size="sm"
                  checked={headerChecked}
                  onCheckedChange={(details) =>
                    toggleAll(details.checked === true)
                  }
                >
                  <Checkbox.HiddenInput aria-label="表示中のものをすべて選ぶ" />
                  <Checkbox.Control />
                </Checkbox.Root>
              </Table.ColumnHeader>
            )}
            {columns.map((column) => (
              <Table.ColumnHeader
                key={column.key}
                className={styles.headerCell}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => {
            const id = getRowId(row);
            const isSelected = selected.has(id);
            return (
              <Table.Row
                key={id}
                className={styles.row}
                data-clickable={rowHref ? "" : undefined}
                data-selected={isSelected ? "" : undefined}
                tabIndex={rowHref ? 0 : undefined}
                onClick={() => openRow(row)}
                onKeyDown={(event) => onRowKeyDown(event, row)}
              >
                {selectable && (
                  // チェックボックスを押しても、行のリンクに移らないようにする
                  <Table.Cell
                    className={styles.checkCell}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Checkbox.Root
                      size="sm"
                      checked={isSelected}
                      onCheckedChange={(details) =>
                        toggleRow(id, details.checked === true)
                      }
                    >
                      <Checkbox.HiddenInput aria-label="この行を選ぶ" />
                      <Checkbox.Control />
                    </Checkbox.Root>
                  </Table.Cell>
                )}
                {columns.map((column) => (
                  <Table.Cell key={column.key} className={styles.cell}>
                    {column.render(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
