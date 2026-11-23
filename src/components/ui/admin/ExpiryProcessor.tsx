"use client";

import { Button, NativeSelect, Tabs } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { FOUND_STATUS_LABELS } from "@/lib/constants";
import type { FoundItemSummary } from "@/lib/types";
import { ConfirmDialog } from "../ConfirmDialog";
import { BroadcastMessageDialog } from "./BroadcastMessageDialog";
import { FoundItemTable } from "./FoundItemTable";
import styles from "./ExpiryProcessor.module.css";

type Tab = "valuable" | "nonValuable";
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
}: {
  valuableItems: FoundItemSummary[];
  nonValuableItems: FoundItemSummary[];
  bulkUpdateAction: (
    ids: string[],
    status: TargetStatus,
  ) => Promise<ActionResult>;
  broadcastAction: (body: string) => Promise<ActionResult>;
  recipientCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("valuable");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<TargetStatus>(
    defaultTargetOf("valuable"),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const rows = tab === "valuable" ? valuableItems : nonValuableItems;
  // 表にない ID（別のタブの分や、更新で消えた分）は数えない
  const rowIds = new Set(rows.map((item) => item.id));
  const targetIds = selectedIds.filter((id) => rowIds.has(id));

  function changeTab(next: Tab) {
    setTab(next);
    setSelectedIds([]);
    setTargetStatus(defaultTargetOf(next));
    setMessage(null);
  }

  function update() {
    startTransition(async () => {
      const result = await bulkUpdateAction(targetIds, targetStatus);
      setConfirmOpen(false);
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      setMessage({
        ok: true,
        text: `${targetIds.length} 件を「${FOUND_STATUS_LABELS[targetStatus]}」にしました`,
      });
      setSelectedIds([]);
      router.refresh();
    });
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
                  {FOUND_STATUS_LABELS[status]}
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
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? styles.success : styles.error}
        >
          {message.text}
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
        title={`${targetIds.length} 件を「${FOUND_STATUS_LABELS[targetStatus]}」にしますか？`}
        description="紐づいている申請がある場合は、その申請のステータスも合わせて変わります。"
        confirmLabel="更新する"
        onConfirm={update}
        pending={pending}
        destructive
      />
    </div>
  );
}
