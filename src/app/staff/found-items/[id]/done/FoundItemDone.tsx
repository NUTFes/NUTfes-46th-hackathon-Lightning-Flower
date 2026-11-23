"use client";

import { Alert, Button, Flex, Skeleton, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { CompletionPanel } from "@/components/CompletionPanel";
import { itemColorLabels } from "@/components/FoundItemDetailFields";
import type { FoundItem } from "@/lib/schemas/found-item";
import { errorMessageOf, fetchApi } from "../../../fetch-api";

type Result =
  | { id: string; state: "ok"; item: FoundItem }
  | { id: string; state: "error"; message: string };

// M03 登録完了の本体。管理番号を出し、本部 Box に届けるよう知らせる
export function FoundItemDone({ id }: { id: string }) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<FoundItem>(`/api/found-items/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((item) => setResult({ id, state: "ok", item }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ id, state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [id]);

  const current = result?.id === id ? result : null;
  const backButton = (
    <Button asChild colorPalette="blue" w="full">
      <NextLink href="/staff">拾得物一覧へ戻る</NextLink>
    </Button>
  );

  if (!current) {
    return (
      <Stack gap="4" pt="8" aria-busy="true">
        <Skeleton boxSize="72px" rounded="full" alignSelf="center" />
        <Skeleton h="120px" rounded="lg" />
        <Skeleton h="80px" rounded="lg" />
      </Stack>
    );
  }

  if (current.state === "error") {
    return (
      <Stack gap="4" pt="8">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>登録した拾得物を読み込めませんでした</Alert.Title>
            <Alert.Description>{current.message}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
        {backButton}
      </Stack>
    );
  }

  const { item } = current;
  return (
    <Stack gap="6" pt="8" pb="6">
      <CompletionPanel
        title="拾得物を登録しました"
        numberLabel="管理番号"
        number={item.displayNumber}
        actions={
          <>
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>本部Boxに届けてください</Alert.Title>
                <Alert.Description>
                  登録後、必ず現物を本部に届けてください。保管場所は本部Boxのみです。
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
            {backButton}
          </>
        }
      >
        <Flex gap="6" wrap="wrap" fontSize="sm">
          <Text>
            カテゴリ：<b>{item.category.name}</b>
          </Text>
          <Text>
            色：<b>{itemColorLabels[item.color]}</b>
          </Text>
        </Flex>
      </CompletionPanel>
    </Stack>
  );
}
