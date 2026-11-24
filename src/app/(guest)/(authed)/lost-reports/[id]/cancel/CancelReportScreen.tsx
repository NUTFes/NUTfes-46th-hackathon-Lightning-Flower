"use client";

import { Alert, Box, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import type { ActionResult } from "@/lib/action-result";
import type { CancelReportInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import { CANCELLABLE_STATUSES, reportTitle } from "../report-title";
import { CancelReportForm } from "./CancelReportForm";

type Result =
  { state: "ok"; report: LostReport } | { state: "error"; message: string };

// G08 申請取り消しの本体。GET /api/lost-reports/{id} で取り消せるかを確かめ、
// POST /api/lost-reports/{id}/cancel で取り消す。取り消したら申請状況（G05）へ戻る
export function CancelReportScreen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
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
  }, [router, reportId, loginHref]);

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
      }
      if (error instanceof FetchApiError && error.status === 409) {
        return {
          ok: false,
          error: "この申請は、もう終わっているので取り消せません。",
        };
      }
      return { ok: false, error: errorMessageOf(error) };
    }
  }

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
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>申請を読み込めませんでした</Alert.Title>
          <Alert.Description>{result.message}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }

  const { report } = result;
  if (!CANCELLABLE_STATUSES.includes(report.status)) {
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
        <Button asChild variant="outline" w="full">
          <NextLink href={statusHref}>申請状況へ戻る</NextLink>
        </Button>
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
