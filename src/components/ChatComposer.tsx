"use client";

import { Button, chakra, Flex, Text, Textarea } from "@chakra-ui/react";
import { useRef, useState, type SubmitEvent } from "react";

export const CHAT_MESSAGE_MAX_LENGTH = 1000;

type ChatComposerProps = {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSend,
  disabled = false,
  placeholder = "メッセージを入力",
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);

  const body = text.trim();
  const canSubmit =
    !disabled &&
    !sending &&
    body.length > 0 &&
    text.length <= CHAT_MESSAGE_MAX_LENGTH;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || inFlight.current) return;

    inFlight.current = true;
    setSending(true);
    setError(undefined);
    try {
      await onSend(body);
      setText("");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "メッセージを送信できませんでした。",
      );
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <chakra.form
      display="flex"
      flexDirection="column"
      onSubmit={submit}
      gap="2"
      bg="white"
      px={{ base: "4", md: "0" }}
      py={{ base: "2", md: "0" }}
      fontFamily='"Noto Sans JP", sans-serif'
      aria-label="メッセージ送信"
    >
      <Flex align="center" gap="3">
        <Textarea
          aria-label="メッセージ本文"
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          disabled={disabled}
          readOnly={sending}
          rows={1}
          resize="none"
          minW="0"
          flex="1"
          minH="0"
          h={{ base: "38px", md: "51px" }}
          px="4"
          py={{ base: "7px", md: "14px" }}
          bg="white"
          color="#0f172a"
          fontSize="13px"
          lineHeight={1.6}
          rounded="8px"
          borderColor="#cbd5e1"
          _placeholder={{ color: "#94a3b8" }}
          _focusVisible={{ borderColor: "#2563eb", outlineColor: "#2563eb" }}
        />
        <Button
          type="submit"
          colorPalette="blue"
          disabled={!canSubmit}
          loading={sending}
          loadingText="送信中"
          flexShrink={0}
          h={{ base: "34px", md: "44px" }}
          px={{ base: "3", md: "5" }}
          fontSize={{ base: "13px", md: "14px" }}
          fontWeight="bold"
          rounded="8px"
          bg="#2563eb"
          color="white"
          _hover={{ bg: "#1d4ed8" }}
          _disabled={{ bg: "#e2e8f0", color: "#94a3b8", opacity: 1 }}
        >
          送信
        </Button>
      </Flex>
      {text.length === CHAT_MESSAGE_MAX_LENGTH && (
        <Text role="status" fontSize="xs" color="#64748b">
          本文は最大1000文字です。
        </Text>
      )}
      {error && (
        <Text role="alert" fontSize="sm" color="#b42318">
          {error}
        </Text>
      )}
    </chakra.form>
  );
}
