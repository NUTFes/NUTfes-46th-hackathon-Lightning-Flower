"use client";

import { Alert, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { LostReportForm } from "@/components/LostReportForm";
import type { ActionResult } from "@/lib/action-result";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type { LostReportInput } from "@/lib/schemas/form-inputs";
import type {
  CreateLostReportBody,
  LostReport,
} from "@/lib/schemas/lost-report";

const LOGIN_PATH = "/?next=/lost-reports/new";

type Categories =
  | { state: "loading" }
  | { state: "ok"; items: Category[] }
  | { state: "error"; message: string };

// G03 遺失物申請フォームの本体。カテゴリを GET /api/categories から取ってからフォームを出し、
// POST /api/lost-reports で申請して G04（申請完了）へ移る
export function LostReportCreate() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categories>({
    state: "loading",
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((body) => setCategories({ state: "ok", items: body.items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategories({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [reloadCount]);

  async function create(
    input: LostReportInput,
  ): Promise<ActionResult<{ id: string }>> {
    const body: CreateLostReportBody = {
      categoryId: input.categoryId,
      color: input.color,
      brand: input.brand,
      lostPlace: input.lostPlace,
      lostAt: input.lostAt,
      note: input.note,
    };
    try {
      const report = await fetchApi<LostReport>("/api/lost-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.push(`/lost-reports/${report.id}/done`);
      return { ok: true, data: { id: report.id } };
    } catch (error) {
      // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(LOGIN_PATH);
      }
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  return (
    <Stack gap="4">
      <Text fontSize="sm" color="gray.600">
        なくした物について教えてください
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
            onClick={() => {
              setCategories({ state: "loading" });
              setReloadCount((count) => count + 1);
            }}
          >
            再読み込み
          </Button>
        </Alert.Root>
      )}

      {categories.state === "ok" && (
        <LostReportForm
          mode="create"
          categories={categories.items}
          action={create}
          submitLabel="申請する"
          notice="入力内容は実行委員のみが確認します。"
        />
      )}
    </Stack>
  );
}
