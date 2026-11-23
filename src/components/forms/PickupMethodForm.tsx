"use client";

import { Button, Field, Textarea } from "@chakra-ui/react";
import { type SubmitEvent, useState, useTransition } from "react";
import { PICKUP_METHODS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { PICKUP_METHOD_LABELS } from "@/lib/constants";
import { PickupMethodInput } from "@/lib/schemas/form-inputs";
import type { PickupMethod } from "@/lib/types";
import { ChoiceCardGroup } from "@/components/ui/ChoiceCardGroup";
import styles from "./Form.module.css";

const OPTIONS = PICKUP_METHODS.map((method) => ({
  value: method,
  label: PICKUP_METHOD_LABELS[method],
}));

// 受け取り方法の選択（G07）。defaultValue は API の LostReport.pickup をそのまま渡せる
export function PickupMethodForm({
  reportId,
  defaultValue,
  action,
}: {
  reportId: string;
  defaultValue?: { method: PickupMethod; note?: string | null } | null;
  action: (input: PickupMethodInput) => Promise<ActionResult>;
}) {
  const [method, setMethod] = useState<PickupMethod | null>(
    defaultValue?.method ?? null,
  );
  const [note, setNote] = useState(defaultValue?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = PickupMethodInput.safeParse({
      reportId,
      method,
      // 自由記述は「その他」のときだけ送る
      note: method === "other" ? note : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力を確かめてください");
      return;
    }

    startTransition(async () => {
      const result = await action(parsed.data);
      if (result.ok) setSaved(true);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <ChoiceCardGroup
        name="pickupMethod"
        label="受け取り方法"
        options={OPTIONS}
        value={method}
        onChange={(value) => {
          setMethod(value);
          setSaved(false);
        }}
        disabled={pending}
      />

      {method === "other" && (
        <Field.Root required>
          <Field.Label>
            受け取り方法の希望
            <Field.RequiredIndicator />
          </Field.Label>
          <Textarea
            className={styles.textarea}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例：明日の 10 時ごろに友人が代わりに取りに行きます"
          />
        </Field.Root>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.success}>
          受け取り方法を送りました。本部からの連絡をお待ちください
        </p>
      )}

      <Button
        type="submit"
        colorPalette="blue"
        className={styles.submit}
        loading={pending}
        disabled={!method}
      >
        この方法で受け取る
      </Button>
    </form>
  );
}
