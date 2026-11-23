"use client";

import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Portal,
  Textarea,
} from "@chakra-ui/react";
import { useState, useTransition } from "react";
import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { BroadcastInput } from "@/lib/schemas/form-inputs";
import styles from "./ExpiryProcessor.module.css";

const DEFAULT_BODY =
  "技大祭の落とし物の受付期間が終わりました。お探しの物は期間中に見つかりませんでした。" +
  "貴重品は警察へ届けていますので、最寄りの警察署にお問い合わせください。";

// 一斉送信の結果。uncertain が付いた失敗は、送れたかどうかわからない（返事が届く前に通信が切れた）
export type BroadcastResult =
  ActionResult<{ sent: number }> | (ActionFailure & { uncertain: true });

// 期間終了まで見つからなかった人へのチャットの一斉送信（A07）
export function BroadcastMessageDialog({
  recipientCount,
  action,
  onOpen,
}: {
  recipientCount: number;
  // 返す sent は、実際に送った人数（送る時点の宛先で決まるので、画面の人数と違うことがある）
  action: (body: string) => Promise<BroadcastResult>;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [error, setError] = useState<string | null>(null);
  // 送った人数。送ったら、このページではもう送れなくする（同じ人に二重に送らないように）
  const [sentCount, setSentCount] = useState<number | null>(null);
  // 送れたかどうかわからないときの文言。送ったかもしれないので、これも押せなくする
  const [uncertain, setUncertain] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    const parsed = BroadcastInput.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "本文を確かめてください");
      return;
    }
    startTransition(async () => {
      const result = await action(parsed.data.body);
      if (!result.ok) {
        if ("uncertain" in result) {
          setUncertain(result.error);
          setOpen(false);
          return;
        }
        setError(result.error);
        return;
      }
      setSentCount(result.data.sent);
      setOpen(false);
    });
  }

  return (
    <>
      <div className={styles.broadcast}>
        <Button
          variant="outline"
          colorPalette="blue"
          onClick={() => {
            setError(null);
            setOpen(true);
            onOpen?.();
          }}
          disabled={
            recipientCount === 0 || sentCount !== null || uncertain !== null
          }
        >
          見つからなかった人へ一斉送信（{recipientCount} 人）
        </Button>
        {sentCount !== null && (
          <span role="status" className={styles.sent}>
            {sentCount} 人に送信しました
          </span>
        )}
        {uncertain && (
          <span role="alert" className={styles.uncertain}>
            {uncertain}
          </span>
        )}
      </div>

      <Dialog.Root
        open={open}
        onOpenChange={(details) => !pending && setOpen(details.open)}
        size="lg"
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>チャットで一斉送信</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body className={styles.dialogBody}>
                <p className={styles.muted}>
                  期間終了まで見つからなかった {recipientCount}{" "}
                  人のチャットに、同じメッセージを送ります。
                  送ったメッセージは取り消せません。前に送っていないか、確かめてから送ってください。
                  宛先は送る時点の「探し中」の申請で決まるので、人数が変わることがあります。
                </p>
                <Field.Root invalid={!!error}>
                  <Field.Label>本文</Field.Label>
                  <Textarea
                    className={styles.textarea}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={pending}
                  />
                  <Field.ErrorText>{error}</Field.ErrorText>
                </Field.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" disabled={pending}>
                    やめる
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="blue"
                  onClick={send}
                  loading={pending}
                  disabled={!body.trim()}
                >
                  {recipientCount} 人に送信する
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" disabled={pending} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
