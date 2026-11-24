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
import { isCancellable, reportTitle } from "./report-title";
import { updateLostReport } from "./update-lost-report";

// 実行委員からの最新のメッセージ。読めなかったときと「まだない」（latest が null）を分ける
type AdminMessage = { state: "ok"; latest: string | null } | { state: "error" };

type Loaded = { report: LostReport; adminMessage: AdminMessage };

type Result =
  { state: "ok"; data: Loaded } | { state: "error"; message: string };

type Categories =
  | { state: "loading" }
  | { state: "ok"; items: Category[] }
  | { state: "error"; message: string };

type Notice = { status: "success" | "warning"; text: string };

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
  // 増やすと申請を取り直す（もう一度読み込む・変更が 409 になったとき）
  const [reloadCount, setReloadCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<Categories>({
    state: "loading",
  });
  const [notice, setNotice] = useState<Notice | null>(null);
  const loginPath = `/?next=/lost-reports/${reportId}`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetchApi<LostReport>(`/api/lost-reports/${reportId}`, { signal }),
      // メッセージが読めなくても、申請状況は出す
      fetchApi<MessageList>(`/api/lost-reports/${reportId}/messages`, {
        signal,
      }).then(
        (messages): AdminMessage => ({
          state: "ok",
          latest:
            messages.items
              .filter((message) => message.senderRole === "admin")
              .at(-1)?.body ?? null,
        }),
        (): AdminMessage => ({ state: "error" }),
      ),
    ])
      .then(([report, adminMessage]) => {
        setResult({ state: "ok", data: { report, adminMessage } });
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
        if (error instanceof FetchApiError && error.status === 401) {
          router.replace(loginPath);
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
  }, [router, reportId, reloadCount, loginPath]);

  // 入力情報の変更を開いたときだけ、カテゴリを取る
  useEffect(() => {
    if (!editing || categories.state !== "loading") return;
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((list) => setCategories({ state: "ok", items: list.items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategories({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [editing, categories.state]);

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

  const { report, adminMessage } = result.data;
  const ended = (ENDED_LOST_STATUSES as readonly string[]).includes(
    report.status,
  );
  // 入力情報の変更は、探し中のときだけ（PATCH は探し中以外だと 409）
  const editable = report.status === "searching";
  const cancellable = isCancellable(report.status);

  function openEditor(open: boolean) {
    setEditing(open);
    setNotice(null);
  }

  async function save(
    input: LostReportInput,
  ): Promise<ActionResult<{ id: string }>> {
    const updated = await updateLostReport(reportId, input);
    if (updated.ok) {
      setResult({
        state: "ok",
        data: { report: updated.report, adminMessage },
      });
      openEditor(false);
      setNotice({ status: "success", text: "入力情報を変更しました" });
      return { ok: true, data: { id: updated.report.id } };
    }
    if (updated.reason === "unauthorized") {
      router.replace(loginPath);
      return { ok: false, error: updated.error };
    }
    if (updated.reason === "conflict") {
      // 実行委員が確認を始めていた。フォームを閉じ、今の状態を取り直して理由を出す
      openEditor(false);
      setNotice({
        status: "warning",
        text: `${updated.error}今の状態を表示しています。`,
      });
      setReloadCount((count) => count + 1);
    }
    return { ok: false, error: updated.error };
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

      {notice && (
        <Alert.Root status={notice.status} role="status">
          <Alert.Indicator />
          <Alert.Title>{notice.text}</Alert.Title>
        </Alert.Root>
      )}

      <ReportProgress status={report.status} />

      {!ended && (
        <Stack as="section" gap="3" {...cardProps}>
          <Heading as="h2" size="sm">
            実行委員からのメッセージ
          </Heading>
          {adminMessage.state === "error" ? (
            <Text fontSize="sm" color="red.600">
              メッセージを読み込めませんでした。チャットを開いて確かめてください。
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">
              {adminMessage.latest
                ? `「${adminMessage.latest}」`
                : "実行委員から連絡があると、ここに表示されます。"}
            </Text>
          )}
          {/* guest が送れるのは、実行委員から 1 通以上届いてから（API が 409 を返す）。
              まだ届いていないときは、開いても送れないのでボタンを出さない */}
          {(adminMessage.state === "error" || adminMessage.latest) && (
            <Button asChild colorPalette="blue" w="full">
              <NextLink href={`/lost-reports/${reportId}/chat`}>
                {adminMessage.state === "ok"
                  ? "チャットに返信する"
                  : "チャットを開く"}
              </NextLink>
            </Button>
          )}
        </Stack>
      )}

      <Stack as="section" gap="2">
        <Heading as="h2" size="sm">
          申請した情報
        </Heading>
        {editing ? (
          <>
            {categories.state === "loading" && (
              <Skeleton h="320px" rounded="lg" />
            )}
            {categories.state === "error" && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>カテゴリを読み込めませんでした</Alert.Title>
                  <Alert.Description>{categories.message}</Alert.Description>
                  <Stack direction="row" gap="2" mt="2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCategories({ state: "loading" })}
                    >
                      もう一度読み込む
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditor(false)}
                    >
                      変更をやめる
                    </Button>
                  </Stack>
                </Alert.Content>
              </Alert.Root>
            )}
            {categories.state === "ok" && (
              <LostReportForm
                key={report.id}
                mode="edit"
                categories={categories.items}
                defaultValues={report}
                action={save}
                submitLabel="変更を保存する"
                notice="入力内容は実行委員のみが確認します。"
                onCancel={() => openEditor(false)}
                cancelLabel="変更をやめる"
              />
            )}
          </>
        ) : (
          <LostReportDetailFields report={report} />
        )}
      </Stack>

      {editable && !editing && (
        <Button variant="outline" w="full" onClick={() => openEditor(true)}>
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
