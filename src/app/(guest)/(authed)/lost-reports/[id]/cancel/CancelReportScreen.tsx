"use client";

import { Alert, Box, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import type { ActionResult } from "@/lib/action-result";
import type { CancelReportInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import { isCancellable, reportTitle } from "../report-title";
import { CancelReportForm } from "./CancelReportForm";

type Result =
  { state: "ok"; report: LostReport } | { state: "error"; message: string };

// G08 申請取り消しの本体。GET /api/lost-reports/{id} で取り消せるかを確かめ、
// POST /api/lost-reports/{id}/cancel で取り消す。取り消したら申請状況（G05）へ戻る
export function CancelReportScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  // 増やすと申請を取り直す（もう一度読み込む・取り消しが 409 になったとき）
  const [reloadCount, setReloadCount] = useState(0);
  const statusHref = `/lost-reports/${reportId}`;
  const loginHref = `/?next=${statusHref}/cancel`;

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<LostReport>(`/api/lost-reports/${reportId}`, {
      signal: controller.signal,
    })
      .then((report) => setResult({ state: "ok", report }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof FetchApiError && error.status === 401) {
          router.replace(loginHref);
          return;
        }
        setResult({
          state: "error",
          message:
            error instanceof FetchApiError && error.status === 404
              ? "申請が見つかりません。ホームから選び直してください。"
              : errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [router, reportId, loginHref, reloadCount]);

  async function cancel(input: CancelReportInput): Promise<ActionResult> {
    try {
      await fetchApi<LostReport>(`/api/lost-reports/${reportId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: input.reason, note: input.note }),
      });
      router.push(statusHref);
      return { ok: true };
    } catch (error) {
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(loginHref);
        return {
          ok: false,
          error: "ログインが切れました。ログインし直してください。",
        };
      }
      if (error instanceof FetchApiError && error.status === 409) {
        // 申請がもう終わっていた。取り直すと「この申請は取り消せません」の表示に変わる
        setReloadCount((count) => count + 1);
        return {
          ok: false,
          error: "この申請は、もう終わっているので取り消せません。",
        };
      }
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  const backButton = (
    <Button asChild variant="outline" w="full">
      <NextLink href={statusHref}>申請状況へ戻る</NextLink>
    </Button>
  );

  if (!result) {
    return (
      <Stack gap="4" aria-busy="true">
        <Skeleton h="64px" rounded="lg" />
        <Skeleton h="160px" rounded="lg" />
      </Stack>
    );
  }

  if (result.state === "error") {
    return (
      <Stack gap="4">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>申請を読み込めませんでした</Alert.Title>
            <Alert.Description>{result.message}</Alert.Description>
            <Box mt="2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setReloadCount((count) => count + 1);
                }}
              >
                もう一度読み込む
              </Button>
            </Box>
          </Alert.Content>
        </Alert.Root>
        {backButton}
      </Stack>
    );
  }

  const { report } = result;
  if (!isCancellable(report.status)) {
    return (
      <Stack gap="4">
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>この申請は取り消せません</Alert.Title>
            <Alert.Description>
              {report.status === "cancelled"
                ? "この申請は、もう取り消されています。"
                : "この申請は、もう終わっています。"}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        {backButton}
      </Stack>
    );
  }

  return (
    <Stack gap="4">
      <Box>
        <Text fontSize="xs" color="gray.500">
          {report.displayNumber}
        </Text>
        <Text fontSize="sm" fontWeight="bold">
          {reportTitle(report)}
        </Text>
      </Box>
      <CancelReportForm
        reportId={reportId}
        action={cancel}
        backHref={statusHref}
      />
    </Stack>
  );
}
