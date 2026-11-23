"use client";

import { Button, Field, Textarea } from "@chakra-ui/react";
import { type SubmitEvent, useState, useTransition } from "react";
import { CANCEL_REASONS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { CANCEL_REASON_LABELS } from "@/lib/constants";
import { CancelReportInput } from "@/lib/schemas/form-inputs";
import type { CancelReason } from "@/lib/types";
import { ChoiceCardGroup } from "@/components/ui/ChoiceCardGroup";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import styles from "./Form.module.css";

const OPTIONS = CANCEL_REASONS.map((reason) => ({
  value: reason,
  label: CANCEL_REASON_LABELS[reason],
}));

// 遺失物申請の取り消し（G08）。取り消すと戻せないので、送る前に確認を挟む。
// 成功したあとの画面の移動は、action の中で redirect() する
export function CancelReportForm({
  reportId,
  action,
}: {
  reportId: string;
  action: (input: CancelReportInput) => Promise<ActionResult>;
}) {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buildInput() {
    return CancelReportInput.safeParse({
      reportId,
      reason,
      note: reason === "other" ? note : null,
    });
  }

  function openConfirm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = buildInput();
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力を確かめてください");
      return;
    }
    setConfirmOpen(true);
  }

  function submit() {
    const parsed = buildInput();
    if (!parsed.success) return;
    startTransition(async () => {
      const result = await action(parsed.data);
      if (!result.ok) setError(result.message);
      setConfirmOpen(false);
    });
  }

  return (
    <form onSubmit={openConfirm} className={styles.form} noValidate>
      <ChoiceCardGroup
        name="cancelReason"
        label="取り消す理由"
        options={OPTIONS}
        value={reason}
        onChange={setReason}
        disabled={pending}
      />

      {reason === "other" && (
        <Field.Root>
          <Field.Label>理由（任意）</Field.Label>
          <Textarea
            className={styles.textarea}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field.Root>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <Button
        type="submit"
        colorPalette="red"
        className={styles.submit}
        disabled={!reason}
      >
        申請を取り消す
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="申請を取り消しますか？"
        description="取り消した申請は元に戻せません。もう一度探すときは、新しく申請してください。"
        confirmLabel="取り消す"
        onConfirm={submit}
        pending={pending}
        destructive
      />
    </form>
  );
}
