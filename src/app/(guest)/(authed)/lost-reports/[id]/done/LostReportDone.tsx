"use client";

import { Alert, Box, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { CompletionPanel } from "@/components/CompletionPanel";
import { DetailList } from "@/components/DetailList";
import { LostReportDetailFields } from "@/components/LostReportDetailFields";
import { LostReportForm } from "@/components/LostReportForm";
import { StatusBadge } from "@/components/StatusBadge";
import type { ActionResult } from "@/lib/action-result";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type { LostReportInput } from "@/lib/schemas/form-inputs";
import type {
  LostReport,
  LostReportPatchBody,
} from "@/lib/schemas/lost-report";

type Result =
  | { id: string; state: "ok"; report: LostReport }
  | { id: string; state: "error"; message: string };

type Categories =
  | { state: "loading" }
  | { state: "ok"; items: Category[] }
  | { state: "error"; message: string };

// G04 申請完了の本体。GET /api/lost-reports/{id} で申請番号と入力した内容を出す。
// 「入力内容を変更する」で同じ画面にフォームを開き、PATCH /api/lost-reports/{id} で直す
// （変更できるのは探し中のあいだだけ。それ以外は API が 409 を返す）
export function LostReportDone({ id }: { id: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<Categories>({
    state: "loading",
  });
  const loginPath = `/?next=${encodeURIComponent(`/lost-reports/${id}/done`)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<LostReport>(`/api/lost-reports/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((report) => setResult({ id, state: "ok", report }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
        if (error instanceof FetchApiError && error.status === 401) {
          router.replace(loginPath);
          return;
        }
        setResult({
          id,
          state: "error",
          message:
            // 400 は id の形が正しくない（URL を手で変えたなど）。404 と同じ案内にする
            error instanceof FetchApiError &&
            (error.status === 404 || error.status === 400)
              ? "申請が見つかりませんでした。ホームから申請を確かめてください。"
              : errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [id, router, loginPath]);

  // カテゴリは、編集を開いたときに初めて取る
  useEffect(() => {
    if (!editing || categories.state === "ok") return;
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((body) => setCategories({ state: "ok", items: body.items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategories({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [editing, categories.state]);

  function openEditor(open: boolean) {
    setEditing(open);
    setSaved(false);
    window.scrollTo({ top: 0 });
  }

  async function update(
    input: LostReportInput,
  ): Promise<ActionResult<{ id: string }>> {
    const body: LostReportPatchBody = {
      categoryId: input.categoryId,
      color: input.color,
      brand: input.brand,
      lostPlace: input.lostPlace,
      lostAt: input.lostAt,
      note: input.note,
    };
    try {
      const report = await fetchApi<LostReport>(
        `/api/lost-reports/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setResult({ id, state: "ok", report });
      openEditor(false);
      setSaved(true);
      return { ok: true, data: { id: report.id } };
    } catch (error) {
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(loginPath);
      }
      return {
        ok: false,
        error:
          error instanceof FetchApiError && error.status === 409
            ? "探し中ではなくなったため、変更できませんでした。ホームから申請状況を確かめてください。"
            : errorMessageOf(error),
      };
    }
  }

  const current = result?.id === id ? result : null;
  const homeButton = (
    <Button asChild colorPalette="blue" size="lg" w="full">
      <NextLink href="/home">ホームへ戻る</NextLink>
    </Button>
  );

  if (!current) {
    return (
      <Stack gap="4" pt="8" aria-busy="true">
        <Skeleton boxSize="72px" rounded="full" alignSelf="center" />
        <Skeleton h="200px" rounded="lg" />
        <Skeleton h="44px" rounded="lg" />
        <Skeleton h="44px" rounded="lg" />
      </Stack>
    );
  }

  if (current.state === "error") {
    return (
      <Stack gap="4" pt="8">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>申請を読み込めませんでした</Alert.Title>
            <Alert.Description>{current.message}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
        {homeButton}
      </Stack>
    );
  }

  const { report } = current;

  if (editing) {
    return (
      <Stack gap="4" pt="4">
        <Text fontSize="sm" color="gray.600">
          {report.displayNumber} の入力内容を変更します
        </Text>
        {categories.state === "loading" && (
          <Stack gap="5" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} h="64px" rounded="lg" />
            ))}
          </Stack>
        )}
        {categories.state === "error" && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>カテゴリを読み込めませんでした</Alert.Title>
              <Alert.Description>{categories.message}</Alert.Description>
            </Alert.Content>
            <Button
              size="xs"
              variant="outline"
              alignSelf="center"
              onClick={() => setCategories({ state: "loading" })}
            >
              再読み込み
            </Button>
          </Alert.Root>
        )}
        {categories.state === "ok" && (
          <LostReportForm
            key={report.id}
            mode="edit"
            categories={categories.items}
            defaultValues={report}
            action={update}
            submitLabel="変更を保存する"
            notice="入力内容は実行委員のみが確認します。"
            onCancel={() => openEditor(false)}
            cancelLabel="変更せずに戻る"
          />
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="6" pt="8" pb="6">
      <CompletionPanel
        title="遺失物申請を受け付けました"
        numberLabel="申請番号"
        number={report.displayNumber}
        actions={
          <>
            {saved && (
              <Alert.Root status="success">
                <Alert.Indicator />
                <Alert.Title>入力内容を変更しました</Alert.Title>
              </Alert.Root>
            )}
            {/* 変更できるのは探し中のあいだだけ */}
            {report.status === "searching" && (
              <Button
                variant="outline"
                colorPalette="blue"
                size="lg"
                w="full"
                onClick={() => openEditor(true)}
              >
                入力内容を変更する
              </Button>
            )}
            {homeButton}
            <Text fontSize="xs" color="gray.500">
              ※
              申請の状況は、ホームの「自分の申請」から確認できます。通知は届かないので、アプリ内で確認してください。
            </Text>
          </>
        }
      >
        <Box borderTopWidth="1px" borderColor="gray.200" mt="2">
          <LostReportDetailFields report={report} />
          <DetailList
            items={[
              {
                label: "ステータス",
                value: <StatusBadge kind="lost" status={report.status} />,
              },
            ]}
          />
        </Box>
      </CompletionPanel>
    </Stack>
  );
}
