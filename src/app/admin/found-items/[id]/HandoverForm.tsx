"use client";

import { Button } from "@chakra-ui/react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import styles from "@/components/Panel.module.css";
import type { ActionResult } from "@/lib/action-result";

export function HandoverForm({
  action,
  disabled = false,
}: {
  action: () => Promise<ActionResult>;
  disabled?: boolean;
}) {
  return (
    <div className={styles.panel}>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            colorPalette="blue"
            w="full"
            disabled={disabled}
          >
            解決済みにする
          </Button>
        }
        title="解決済みにしますか？"
        description="返却を記録し、拾得物と紐づいている申請を「解決済み」にします。"
        confirmLabel="解決済みにする"
        colorPalette="blue"
        action={action}
      />
    </div>
  );
}
