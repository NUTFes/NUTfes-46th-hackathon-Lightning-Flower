"use client";

import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { type SubmitEvent, useState, useTransition } from "react";
import { Field } from "@/components/Field";
import styles from "@/components/Form.module.css";
import { Radio } from "@/components/Radio";
import { CANCEL_REASONS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { CANCEL_REASON_LABELS } from "@/lib/constants";
import { CancelReportInput } from "@/lib/schemas/form-inputs";
import type { CancelReason } from "@/lib/types";

const OPTIONS = CANCEL_REASONS.map((reason) => ({
  value: reason,
  label: CANCEL_REASON_LABELS[reason],
}));

// 遺失物申請の取り消し（G08）。この画面そのものが「取り消しますか？」の確認なので、ダイアログは挟まない。
// 成功したあとの画面の移動は、action を渡す側で行う
export function CancelReportForm({
  reportId,
  action,
  backHref,
}: {
  reportId: string;
  action: (input: CancelReportInput) => Promise<ActionResult>;
  backHref: string;
}) {
  const [reason, setReason] = useState<CancelReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = CancelReportInput.safeParse({
      reportId,
      reason,
      note: reason === "other" ? note : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力を確かめてください");
      return;
    }
    startTransition(async () => {
      const result = await action(parsed.data);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <Stack gap="2">
        <Heading as="h2" fontSize="lg">
          申請を取り消しますか？
        </Heading>
        <Text fontSize="sm" color="gray.600">
          取り消し後も記録は残ります。
          <br />
          この申請についての照合を終了します。
        </Text>
      </Stack>

      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="lg"
        p="4"
      >
        <Text fontSize="sm" fontWeight="bold" mb="3">
          理由を選択
        </Text>
        <Radio
          name="cancelReason"
          label="理由を選択"
          options={OPTIONS}
          value={reason}
          onChange={(value) => setReason(value as CancelReason)}
          disabled={pending}
        />
        {reason === "other" && (
          <Box mt="3">
            <Field
              kind="textarea"
              label="理由（任意）"
              disabled={pending}
              control={{
                value: note,
                onChange: (event) => setNote(event.currentTarget.value),
              }}
            />
          </Box>
        )}
      </Box>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Button
          type="submit"
          colorPalette="blue"
          className={styles.submit}
          loading={pending}
          disabled={!reason}
        >
          申請を取り消す
        </Button>
        {/* リンクは aria-disabled では押せてしまうので、送信中はふつうの押せないボタンにする */}
        {pending ? (
          <Button variant="outline" className={styles.submit} disabled>
            戻る
          </Button>
        ) : (
          <Button asChild variant="outline" className={styles.submit}>
            <NextLink href={backHref}>戻る</NextLink>
          </Button>
        )}
      </div>

      <Text fontSize="xs" color="gray.500">
        実行委員側にも取り消しが反映されます。
      </Text>
    </form>
  );
}
