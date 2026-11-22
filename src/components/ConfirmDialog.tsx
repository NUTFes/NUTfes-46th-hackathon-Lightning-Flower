"use client";

import { Button, Dialog, Portal, Text } from "@chakra-ui/react";
import { useRef, useState, type ReactElement, type ReactNode } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

type ConfirmDialogProps = {
  trigger?: ReactElement;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  colorPalette?: "red" | "blue";
  action: () => Promise<ActionResult>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "キャンセル",
  colorPalette = "red",
  action,
  open,
  onOpenChange,
  onCancel,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);

  function changeOpen(nextOpen: boolean) {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
    setError(undefined);
  }

  async function confirm() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result = await action();
      if (result.ok) changeOpen(false);
      else setError(result.error);
    } catch {
      setError("処理に失敗しました。もう一度お試しください。");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog.Root
      role="alertdialog"
      placement="center"
      open={open ?? internalOpen}
      closeOnInteractOutside={!pending}
      closeOnEscape={!pending}
      initialFocusEl={() => cancelButton.current}
      onOpenChange={({ open }) => {
        if (busy.current) return;
        changeOpen(open);
        if (!open) onCancel?.();
      }}
    >
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx="4" rounded="12px">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            {(description != null || error) && (
              <Dialog.Body>
                {description != null && (
                  <Dialog.Description asChild>
                    <div>{description}</div>
                  </Dialog.Description>
                )}
                {error && (
                  <Text role="alert" mt="2" color="#b42318">
                    {error}
                  </Text>
                )}
              </Dialog.Body>
            )}
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button
                  ref={cancelButton}
                  type="button"
                  variant="outline"
                  disabled={pending}
                >
                  {cancelLabel}
                </Button>
              </Dialog.CloseTrigger>
              <Button
                type="button"
                colorPalette={colorPalette}
                loading={pending}
                onClick={confirm}
              >
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
