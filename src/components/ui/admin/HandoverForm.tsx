"use client";

import { Button, Field, Input } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/constants";
import { HandoverInput } from "@/lib/schemas/form-inputs";
import { ConfirmDialog } from "../ConfirmDialog";
import styles from "./Panel.module.css";

type FieldErrors = Partial<
  Record<"receiverName" | "handledBy" | "handedAt", string>
>;

// 本部で直接返却（A03）。送る前に確認を挟む。
// 成功すると拾得物は解決済みになり、紐づいている申請があればそれも解決済みにする（サーバー側の処理）
export function HandoverForm({
  itemId,
  action,
}: {
  itemId: string;
  action: (input: HandoverInput) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [receiverName, setReceiverName] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [handedAt, setHandedAt] = useState(() =>
    toLocalInputValue(new Date().toISOString()),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function parse() {
    return HandoverInput.safeParse({
      itemId,
      receiverName,
      handledBy,
      handedAt: fromLocalInputValue(handedAt),
    });
  }

  function openConfirm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = parse();
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        next[key] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setConfirmOpen(true);
  }

  function submit() {
    const parsed = parse();
    if (!parsed.success) return;
    startTransition(async () => {
      const result = await action(parsed.data);
      setConfirmOpen(false);
      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
    });
  }

  return (
    <form className={styles.panel} onSubmit={openConfirm} noValidate>
      <h2 className={styles.title}>本部で直接返却</h2>
      <p className={styles.description}>
        本部に来た人へその場で渡したときに記録します。記録すると「解決済み」になります。
      </p>

      <div className={styles.fields}>
        <Field.Root invalid={!!fieldErrors.receiverName} required>
          <Field.Label>
            受け取った人の名前
            <Field.RequiredIndicator />
          </Field.Label>
          <Input
            value={receiverName}
            onChange={(event) => setReceiverName(event.target.value)}
            autoComplete="off"
          />
          <Field.ErrorText>{fieldErrors.receiverName}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!fieldErrors.handledBy} required>
          <Field.Label>
            対応した人
            <Field.RequiredIndicator />
          </Field.Label>
          <Input
            value={handledBy}
            onChange={(event) => setHandledBy(event.target.value)}
            autoComplete="off"
          />
          <Field.ErrorText>{fieldErrors.handledBy}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!fieldErrors.handedAt} required>
          <Field.Label>
            渡した日時
            <Field.RequiredIndicator />
          </Field.Label>
          <Input
            type="datetime-local"
            value={handedAt}
            onChange={(event) => setHandedAt(event.target.value)}
          />
          <Field.ErrorText>{fieldErrors.handedAt}</Field.ErrorText>
        </Field.Root>
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.footer}>
        <Button type="submit" colorPalette="green">
          返却を記録する
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="返却を記録しますか？"
        description={`受け取った人：${receiverName}\n対応した人：${handledBy}\n\n拾得物と、紐づいている申請が「解決済み」になります。`}
        confirmLabel="記録する"
        onConfirm={submit}
        pending={pending}
      />
    </form>
  );
}
