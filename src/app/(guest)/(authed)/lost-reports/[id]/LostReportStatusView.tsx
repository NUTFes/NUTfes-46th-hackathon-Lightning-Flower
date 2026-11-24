"use client";

import {
  Alert,
  Box,
  Button,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { LostReportDetailFields } from "@/components/LostReportDetailFields";
import { LostReportForm } from "@/components/LostReportForm";
import { ReportProgress } from "@/components/ReportProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { ENDED_LOST_STATUSES } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type { LostReportInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import type { MessageList } from "@/lib/schemas/message";
import { CANCELLABLE_STATUSES, reportTitle } from "./report-title";

type Loaded = {
  report: LostReport;
  // 実行委員からの最新のメッセージ（なければ null）
  latestAdminMessage: string | null;
};

type Result =
  { state: "ok"; data: Loaded } | { state: "error"; message: string };

const cardProps = {
  bg: "white",
  borderWidth: "1px",
  borderColor: "gray.200",
  rounded: "lg",
  p: "4",
} as const;

// G05 申請状況の本体。GET /api/lost-reports/{id} と GET /api/lost-reports/{id}/messages から取る
export function LostReportStatusView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetchApi<LostReport>(`/api/lost-reports/${reportId}`, { signal }),
      // メッセージが読めなくても、申請状況は出す
      fetchApi<MessageList>(`/api/lost-reports/${reportId}/messages`, {
        signal,
      }).catch(() => null),
    ])
      .then(([report, messages]) => {
        const latest = messages?.items
          .filter((message) => message.senderRole === "admin")
          .at(-1);
        setResult({
          state: "ok",
          data: { report, latestAdminMessage: latest?.body ?? null },
        });
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
        if (error instanceof FetchApiError && error.status === 401) {
          router.replace(`/?next=/lost-reports/${reportId}`);
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
  }, [router, reportId, reloadCount]);

  // 入力情報の変更を開いたときだけ、カテゴリを取る
  useEffect(() => {
    if (!editing || categories) return;
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((list) => setCategories(list.items))
      .catch(() => {
        if (!controller.signal.aborted) setCategories([]);
      });
    return () => controller.abort();
  }, [editing, categories]);

  if (!result) {
    return (
      <Stack gap="4" aria-busy="true">
        <Skeleton h="72px" rounded="lg" />
        <Skeleton h="160px" rounded="lg" />
        <Skeleton h="120px" rounded="lg" />
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
    );
  }

  const { report, latestAdminMessage } = result.data;
  const ended = (ENDED_LOST_STATUSES as readonly string[]).includes(
    report.status,
  );
  // 入力情報の変更は、探し中のときだけ（PATCH は探し中以外だと 409）
  const editable = report.status === "searching";
  const cancellable = CANCELLABLE_STATUSES.includes(report.status);

  async function save(
    input: LostReportInput,
  ): Promise<ActionResult<{ id: string }>> {
    try {
      const updated = await fetchApi<LostReport>(
        `/api/lost-reports/${reportId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      setResult({
        state: "ok",
        data: { report: updated, latestAdminMessage },
      });
      setEditing(false);
      return { ok: true, data: { id: updated.id } };
    } catch (error) {
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(`/?next=/lost-reports/${reportId}`);
      }
      if (error instanceof FetchApiError && error.status === 409) {
        return {
          ok: false,
          error:
            "実行委員が確認を始めたため、入力情報を変更できなくなりました。ページを読み込み直してください。",
        };
      }
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  return (
    <Stack gap="5">
      <Stack gap="1" align="flex-start">
        <Text fontSize="xs" color="gray.500">
          {report.displayNumber}
        </Text>
        <Heading as="h2" fontSize="xl">
          {reportTitle(report)}
        </Heading>
        <Box mt="1">
          <StatusBadge kind="lost" status={report.status} />
        </Box>
      </Stack>

      <ReportProgress status={report.status} />

      {!ended && (
        <Stack as="section" gap="3" {...cardProps}>
          <Heading as="h2" size="sm">
            実行委員からのメッセージ
          </Heading>
          <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">
            {latestAdminMessage
              ? `「${latestAdminMessage}」`
              : "まだメッセージはありません。気になることがあればチャットで聞けます。"}
          </Text>
          <Button asChild colorPalette="blue" w="full">
            <NextLink href={`/lost-reports/${reportId}/chat`}>
              {latestAdminMessage ? "チャットに返信する" : "チャットを開く"}
            </NextLink>
          </Button>
        </Stack>
      )}

      <Stack as="section" gap="2">
        <Heading as="h2" size="sm">
          申請した情報
        </Heading>
        {editing ? (
          categories === null ? (
            <Skeleton h="320px" rounded="lg" />
          ) : (
            <Stack gap="2">
              <LostReportForm
                mode="edit"
                categories={categories}
                defaultValues={report}
                action={save}
                submitLabel="変更を保存する"
              />
              <Button variant="ghost" onClick={() => setEditing(false)}>
                変更をやめる
              </Button>
            </Stack>
          )
        ) : (
          <LostReportDetailFields report={report} />
        )}
      </Stack>

      {editable && !editing && (
        <Button variant="outline" w="full" onClick={() => setEditing(true)}>
          入力情報を変更
        </Button>
      )}

      {cancellable && !editing && (
        <Button asChild variant="plain" color="red.600" size="sm">
          <NextLink href={`/lost-reports/${reportId}/cancel`}>
            申請を取り消す
          </NextLink>
        </Button>
      )}
    </Stack>
  );
}
