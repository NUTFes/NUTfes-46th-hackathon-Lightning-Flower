"use client";

import { Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DateTimeField } from "@/components/DateTimeField";
import { Field } from "@/components/Field";
import styles from "@/components/Panel.module.css";
import type { ActionResult } from "@/lib/action-result";
import { fromLocalInputValue } from "@/lib/constants";
import { HandoverInput } from "@/lib/schemas/form-inputs";
import { fieldErrorsOf, type FieldErrors } from "@/components/form-errors";

// 本部で直接返却（A03）。送る前に確認を挟む。
// 成功すると拾得物は解決済みになり、紐づいている申請があればそれも解決済みにする（サーバー側の処理）。
// 記録した人は、サーバーで Access の JWT のメールアドレスを入れる（handovers.recorded_by_email）
export function HandoverForm({
  itemId,
  action,
}: {
  itemId: string;
  action: (input: HandoverInput) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [receiverName, setReceiverName] = useState("");
  const [handedAt, setHandedAt] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<keyof HandoverInput>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  function parse() {
    return HandoverInput.safeParse({
      itemId,
      receiverName,
      handedAt: fromLocalInputValue(handedAt),
    });
  }

  function openConfirm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parse();
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});
    setConfirmOpen(true);
  }

  async function submit(): Promise<ActionResult> {
    const parsed = parse();
    if (!parsed.success) {
      return { ok: false, error: "入力を確かめてください" };
    }
    const result = await action(parsed.data);
    if (result.ok) router.refresh();
    else setFieldErrors(result.fieldErrors ?? {});
    // 失敗したときは、ダイアログの中にエラーが出る
    return result;
  }

  return (
    <form className={styles.panel} onSubmit={openConfirm} noValidate>
      <h2 className={styles.title}>本部で直接返却</h2>
      <p className={styles.description}>
        本部に来た人へその場で渡したときに記録します。記録すると「解決済み」になります。
      </p>

      <div className={styles.fields}>
        <Field
          label="受け取った人の名前"
          required
          invalid={!!fieldErrors.receiverName}
          errorText={fieldErrors.receiverName}
          control={{
            value: receiverName,
            onChange: (event) => setReceiverName(event.currentTarget.value),
            autoComplete: "off",
          }}
        />
        <DateTimeField
          label="渡した日時"
          required
          defaultNow
          value={handedAt}
          onChange={setHandedAt}
          invalid={!!fieldErrors.handedAt}
          errorText={fieldErrors.handedAt}
        />
      </div>

      <div className={styles.footer}>
        <Button type="submit" colorPalette="green">
          返却を記録する
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="返却を記録しますか？"
        description={
          <>
            受け取った人：{receiverName}
            <br />
            拾得物と、紐づいている申請が「解決済み」になります。
          </>
        }
        confirmLabel="記録する"
        colorPalette="blue"
        action={submit}
      />
    </form>
  );
}
