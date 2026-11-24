"use client";

import { Button, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/Field";
import styles from "@/components/Panel.module.css";
import {
  StatusBadge,
  statusLabel,
  type FoundItemStatus,
} from "@/components/StatusBadge";
import type { ActionResult } from "@/lib/action-result";
import type { StatusChangeInput } from "@/lib/schemas/form-inputs";

// 戻せない（期間終了の処理と同じ扱いになる）ステータス。変える前に確認を挟む
const FINAL_STATUSES: FoundItemStatus[] = [
  "resolved",
  "transferred_to_police",
  "disposed",
];

// 拾得物のステータス変更（A03）。選べる次のステータスはサーバーで計算して allowedNext に渡す
export function StatusChangePanel({
  itemId,
  currentStatus,
  linkedReport,
  allowedNext,
  action,
  disabled = false,
  disabledReason,
}: {
  itemId: string;
  currentStatus: FoundItemStatus;
  // API の FoundItem.activeMatch をそのまま渡せる
  linkedReport?: { lostReportId: string; displayNumber: string } | null;
  allowedNext: readonly FoundItemStatus[];
  disabled?: boolean;
  disabledReason?: string;
  action: (input: StatusChangeInput) => Promise<ActionResult>;
}) {
  const [nextStatus, setNextStatus] = useState<FoundItemStatus | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // 成功したら画面のステータスと allowedNext を取り直す
  async function change(status: FoundItemStatus) {
    const result = await action({ itemId, status });
    if (result.ok) {
      setSaved(true);
      setNextStatus("");
    }
    return result;
  }

  function submit() {
    if (disabled || !nextStatus || nextStatus === currentStatus) return;
    setError(null);
    setSaved(false);
    if (FINAL_STATUSES.includes(nextStatus)) {
      setConfirmOpen(true);
      return;
    }
    startTransition(async () => {
      const result = await change(nextStatus);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className={styles.panel} aria-labelledby={`status-${itemId}`}>
      <h2 id={`status-${itemId}`} className={styles.title}>
        ステータス管理
      </h2>
      <div className={styles.current}>
        <span className={styles.currentLabel}>現在</span>
        <StatusBadge kind="found" status={currentStatus} />
      </div>
      {linkedReport && (
        <div className={styles.current}>
          <span className={styles.currentLabel}>紐づく申請</span>
          <Link asChild>
            <NextLink href={`/admin/lost-reports/${linkedReport.lostReportId}`}>
              {linkedReport.displayNumber}
            </NextLink>
          </Link>
        </div>
      )}

      {disabledReason && <p className={styles.description}>{disabledReason}</p>}
      {allowedNext.length === 0 ? (
        <p className={styles.description}>このステータスからは変更できません</p>
      ) : (
        <>
          <Field
            kind="select"
            label="変更後のステータス"
            disabled={disabled || pending || !!disabledReason}
            control={{
              value: nextStatus,
              onChange: (event) => {
                setNextStatus(
                  event.currentTarget.value as FoundItemStatus | "",
                );
                setSaved(false);
              },
              children: (
                <>
                  <option value="" disabled>
                    選択してください
                  </option>
                  {allowedNext.map((status) => (
                    <option
                      key={status}
                      value={status}
                      disabled={status === currentStatus}
                    >
                      {statusLabel(status)}
                    </option>
                  ))}
                </>
              ),
            }}
          />
          <div className={styles.footer}>
            <Button
              colorPalette="blue"
              onClick={submit}
              w="full"
              disabled={
                disabled ||
                !!disabledReason ||
                !nextStatus ||
                nextStatus === currentStatus
              }
              loading={pending}
            >
              変更する
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.success}>
          ステータスを変更しました
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`「${nextStatus ? statusLabel(nextStatus) : ""}」に変更しますか？`}
        description={
          linkedReport
            ? `紐づいている申請（${linkedReport.displayNumber}）のステータスも合わせて変わります。`
            : "変更したあとは、元のステータスに戻せない場合があります。"
        }
        confirmLabel="変更する"
        colorPalette={nextStatus === "resolved" ? "blue" : "red"}
        // 失敗したときは、ダイアログの中にエラーが出る
        action={async () => (nextStatus ? change(nextStatus) : { ok: true })}
      />
    </section>
  );
}
