"use client";

import { Button, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import type { Me } from "@/lib/schemas/me";

type LogoutButtonProps = {
  label?: string;
  disabled?: boolean;
} & (
  | { role: "guest"; signOut?: () => Promise<void> }
  | { role: Exclude<Me["role"], "guest"> }
);

export function LogoutButton(props: LogoutButtonProps) {
  const { label = "ログアウト", disabled } = props;
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);

  if (props.role !== "guest") {
    return disabled ? (
      <Button type="button" variant="outline" disabled>
        {label}
      </Button>
    ) : (
      <Button asChild variant="outline">
        <a href="/cdn-cgi/access/logout">{label}</a>
      </Button>
    );
  }

  const signOut = props.signOut;
  return (
    <Stack gap="1" align="start">
      <Button
        type="button"
        variant="outline"
        loading={pending}
        disabled={disabled || !signOut}
        onClick={async () => {
          if (!signOut || busy.current) return;
          busy.current = true;
          setPending(true);
          setFailed(false);
          try {
            await signOut();
          } catch {
            setFailed(true);
          } finally {
            busy.current = false;
            setPending(false);
          }
        }}
      >
        {label}
      </Button>
      {failed && (
        <Text role="alert" color="#b42318" fontSize="xs">
          ログアウトできませんでした。
        </Text>
      )}
    </Stack>
  );
}
