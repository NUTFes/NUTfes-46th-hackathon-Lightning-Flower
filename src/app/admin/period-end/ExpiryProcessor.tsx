"use client";

import { Button, NativeSelect, Tabs } from "@chakra-ui/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FoundItemTable } from "@/components/FoundItemTable";
import { statusLabel } from "@/components/StatusBadge";
import type { ActionResult } from "@/lib/action-result";
import type { FoundItem } from "@/lib/schemas/found-item";
import { BroadcastMessageDialog } from "./BroadcastMessageDialog";
import styles from "./ExpiryProcessor.module.css";

export type Tab = "valuable" | "nonValuable";
type TargetStatus = "transferred_to_police" | "disposed";

const TARGET_STATUSES: TargetStatus[] = ["transferred_to_police", "disposed"];

// 貴重品は警察へ、それ以外は処分を初期値にする
const defaultTargetOf = (tab: Tab): TargetStatus =>
  tab === "valuable" ? "transferred_to_police" : "disposed";

// 期間終了処理（A07）。一括変更も個別変更も「選択して更新」で行う（1 件だけ選べば個別変更）
export function ExpiryProcessor({
  valuableItems,
  nonValuableItems,
  bulkUpdateAction,
  broadcastAction,
  recipientCount,
  tab: controlledTab,
  onTabChange,
}: {
  valuableItems: FoundItem[];
  nonValuableItems: FoundItem[];
  bulkUpdateAction: (
    ids: string[],
    status: TargetStatus,
  ) => Promise<ActionResult>;
  broadcastAction: (body: string) => Promise<ActionResult>;
  recipientCount: number;
  // 渡すと、表示するタブを外から決められる（A07 の集計カードの「対象を確認」から切り替えるため）
  tab?: Tab;
  onTabChange?: (tab: Tab) => void;
}) {
  const [internalTab, setInternalTab] = useState<Tab>("valuable");
  const tab = controlledTab ?? internalTab;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<TargetStatus>(
    defaultTargetOf(tab),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rows = tab === "valuable" ? valuableItems : nonValuableItems;
  // 表にない ID（別のタブの分や、更新で消えた分）は数えない
  const rowIds = new Set(rows.map((item) => item.id));
  const targetIds = selectedIds.filter((id) => rowIds.has(id));

  // 外からタブが変わったときも、選択と変更後のステータスを合わせ直す
  const [shownTab, setShownTab] = useState<Tab>(tab);
  if (shownTab !== tab) {
    setShownTab(tab);
    setSelectedIds([]);
    setTargetStatus(defaultTargetOf(tab));
    setMessage(null);
  }

  function changeTab(next: Tab) {
    setInternalTab(next);
    onTabChange?.(next);
  }

  // 失敗したときは、ダイアログの中にエラーが出る。一覧の読み直しは action の側で行う
  async function update(): Promise<ActionResult> {
    // 読み直しで選んだものが一覧から消えたとき
    if (targetIds.length === 0) {
      return { ok: false, error: "変える拾得物を選び直してください。" };
    }
    const result = await bulkUpdateAction(targetIds, targetStatus);
    if (result.ok) {
      setMessage(
        `${targetIds.length} 件を「${statusLabel(targetStatus)}」にしました`,
      );
      setSelectedIds([]);
    }
    return result;
  }

  return (
    <div className={styles.root}>
      <BroadcastMessageDialog
        recipientCount={recipientCount}
        action={broadcastAction}
      />

      <Tabs.Root
        value={tab}
        onValueChange={(details) => changeTab(details.value as Tab)}
        variant="line"
      >
        <Tabs.List>
          <Tabs.Trigger value="valuable">
            貴重品（{valuableItems.length}）
          </Tabs.Trigger>
          <Tabs.Trigger value="nonValuable">
            貴重品以外（{nonValuableItems.length}）
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div className={styles.toolbar}>
        <span className={styles.selectedCount}>
          {targetIds.length} 件を選択中
        </span>
        <div className={styles.toolbarActions}>
          <NativeSelect.Root size="sm" className={styles.statusSelect}>
            <NativeSelect.Field
              aria-label="変更後のステータス"
              value={targetStatus}
              onChange={(event) =>
                setTargetStatus(event.target.value as TargetStatus)
              }
            >
              {TARGET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button
            size="sm"
            colorPalette="red"
            disabled={targetIds.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            選択したものを更新
          </Button>
        </div>
      </div>

      {message && (
        <p role="status" className={styles.success}>
          {message}
        </p>
      )}

      <FoundItemTable
        rows={rows}
        selectable
        selectedIds={targetIds}
        onSelectionChange={setSelectedIds}
        emptyState="処理が必要な拾得物はありません"
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${targetIds.length} 件を「${statusLabel(targetStatus)}」にしますか？`}
        description="変えた拾得物は、この一覧から消えます。"
        confirmLabel="更新する"
        colorPalette="red"
        action={update}
      />
    </div>
  );
}
