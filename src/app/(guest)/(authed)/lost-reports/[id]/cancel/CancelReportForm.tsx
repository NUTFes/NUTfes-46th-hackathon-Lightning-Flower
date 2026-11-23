"use client";

import { Button } from "@chakra-ui/react";
import { type SubmitEvent, useState } from "react";
import { ChoiceCardGroup } from "@/components/ChoiceCardGroup";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/Field";
import styles from "@/components/Form.module.css";
import { CANCEL_REASONS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { CANCEL_REASON_LABELS } from "@/lib/constants";
import { CancelReportInput } from "@/lib/schemas/form-inputs";
import type { CancelReason } from "@/lib/types";

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
  const [reason, setReason] = useState<CancelReason | "">("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 失敗したときは、ダイアログの中にエラーが出る
  async function submit(): Promise<ActionResult> {
    const parsed = buildInput();
    if (!parsed.success) return { ok: false, error: "入力を確かめてください" };
    return action(parsed.data);
  }

  return (
    <form onSubmit={openConfirm} className={styles.form} noValidate>
      <ChoiceCardGroup
        name="cancelReason"
        label="取り消す理由"
        options={OPTIONS}
        value={reason}
        onChange={(value) => setReason(value as CancelReason)}
      />

      {reason === "other" && (
        <Field
          kind="textarea"
          label="理由（任意）"
          control={{
            value: note,
            onChange: (event) => setNote(event.currentTarget.value),
          }}
        />
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
        colorPalette="red"
        action={submit}
      />
    </form>
  );
}
