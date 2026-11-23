"use client";

import { Button, Field, Link, NativeSelect } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { FOUND_STATUS_LABELS } from "@/lib/constants";
import type { StatusChangeInput } from "@/lib/schemas/form-inputs";
import type { FoundItemStatus } from "@/lib/types";
import { ConfirmDialog } from "../ConfirmDialog";
import { StatusBadge } from "../StatusBadge";
import styles from "./Panel.module.css";

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
}: {
  itemId: string;
  currentStatus: FoundItemStatus;
  linkedReport?: { id: string; number: string };
  allowedNext: FoundItemStatus[];
  action: (input: StatusChangeInput) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<FoundItemStatus | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(status: FoundItemStatus) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await action({ itemId, status });
      setConfirmOpen(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(true);
      setNextStatus("");
      // 画面のステータスと allowedNext を取り直す
      router.refresh();
    });
  }

  function submit() {
    if (!nextStatus) return;
    if (FINAL_STATUSES.includes(nextStatus)) setConfirmOpen(true);
    else run(nextStatus);
  }

  return (
    <section className={styles.panel} aria-labelledby={`status-${itemId}`}>
      <h2 id={`status-${itemId}`} className={styles.title}>
        ステータス
      </h2>
      <div className={styles.current}>
        <span className={styles.currentLabel}>いま</span>
        <StatusBadge kind="found" status={currentStatus} />
      </div>
      {linkedReport && (
        <div className={styles.current}>
          <span className={styles.currentLabel}>紐づく申請</span>
          <Link asChild>
            <NextLink href={`/admin/lost-reports/${linkedReport.id}`}>
              {linkedReport.number}
            </NextLink>
          </Link>
        </div>
      )}

      {allowedNext.length === 0 ? (
        <p className={styles.description}>このステータスからは変更できません</p>
      ) : (
        <>
          <Field.Root>
            <Field.Label>変更後のステータス</Field.Label>
            <NativeSelect.Root disabled={pending}>
              <NativeSelect.Field
                value={nextStatus}
                onChange={(event) => {
                  setNextStatus(event.target.value as FoundItemStatus | "");
                  setSaved(false);
                }}
              >
                <option value="">選んでください</option>
                {allowedNext.map((status) => (
                  <option key={status} value={status}>
                    {FOUND_STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <div className={styles.footer}>
            <Button
              colorPalette="blue"
              onClick={submit}
              disabled={!nextStatus}
              loading={pending && !confirmOpen}
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
        title={`「${nextStatus ? FOUND_STATUS_LABELS[nextStatus] : ""}」に変更しますか？`}
        description={
          linkedReport
            ? `紐づいている申請（${linkedReport.number}）のステータスも合わせて変わります。`
            : "変更したあとは、元のステータスに戻せない場合があります。"
        }
        confirmLabel="変更する"
        onConfirm={() => nextStatus && run(nextStatus)}
        pending={pending}
        destructive={nextStatus !== "resolved"}
      />
    </section>
  );
}
