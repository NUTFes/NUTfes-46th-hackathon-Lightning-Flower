"use client";

import { Alert, Box, Button, Skeleton } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import type { Me } from "@/lib/schemas/me";
import { AccountInfoCard } from "./AccountInfoCard";

type Result = { state: "ok"; me: Me } | { state: "error"; message: string };

// A08 設定の本体。/admin には Cloudflare Access でログインした staff だけが来る
export function SettingsScreen() {
  const [result, setResult] = useState<Result | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<Me>("/api/me", { signal: controller.signal })
      .then((me) => setResult({ state: "ok", me }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [reloadCount]);

  return (
    <Box maxW="32rem">
      {!result && <Skeleton h="220px" rounded="lg" aria-busy />}

      {result?.state === "error" && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>アカウントの情報を読み込めませんでした</Alert.Title>
            <Alert.Description>{result.message}</Alert.Description>
          </Alert.Content>
          <Button
            size="xs"
            variant="outline"
            alignSelf="center"
            onClick={() => {
              setResult(null);
              setReloadCount((count) => count + 1);
            }}
          >
            再読み込み
          </Button>
        </Alert.Root>
      )}

      {result?.state === "ok" && result.me.role === "guest" && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>この画面を見る権限がありません</Alert.Title>
            <Alert.Description>
              実行委員のアカウントでログインしてください。
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {result?.state === "ok" && result.me.role !== "guest" && (
        <AccountInfoCard
          email={result.me.email}
          role={result.me.role}
          authProvider="Cloudflare Access"
        />
      )}
    </Box>
  );
}
