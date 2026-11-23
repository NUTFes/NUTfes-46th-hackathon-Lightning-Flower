"use client";

import { Alert, Box, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import type { FilterOption } from "@/components/FilterDropdown";
import { FoundItemCard } from "@/components/FoundItemCard";
import {
  ItemFilterBar,
  type ItemFilterValues,
} from "@/components/ItemFilterBar";
import { statusLabel } from "@/components/StatusBadge";
import { FOUND_STATUSES } from "@/db/enums";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/constants";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type { FoundItem, FoundItemList } from "@/lib/schemas/found-item";
import { errorMessageOf, fetchApi } from "./fetch-api";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS = FOUND_STATUSES.map((value) => ({
  value,
  label: statusLabel(value),
}));

// 「時間」の絞り込み。拾った時刻がこの時刻以降のものを出す
const TIME_OPTIONS = [
  { value: "1h", label: "1 時間以内" },
  { value: "3h", label: "3 時間以内" },
  { value: "today", label: "今日" },
] as const satisfies readonly FilterOption[];

function foundFromOf(time: string | undefined): string | undefined {
  const now = Date.now();
  switch (time) {
    case "1h":
      return new Date(now - 60 * 60 * 1000).toISOString();
    case "3h":
      return new Date(now - 3 * 60 * 60 * 1000).toISOString();
    case "today": {
      // 日本時間の今日の 0:00
      const today = toLocalInputValue(new Date(now).toISOString()).slice(0, 10);
      return fromLocalInputValue(`${today}T00:00`) || undefined;
    }
  }
  return undefined;
}

type Filters = Omit<ItemFilterValues, "keyword"> & { keyword: string };

function searchPathOf(filters: Filters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  const keyword = filters.keyword.trim();
  if (keyword) params.set("q", keyword);
  if (filters.category) params.set("categoryId", String(filters.category));
  if (filters.status) params.set("status", filters.status);
  const foundFrom = foundFromOf(filters.time);
  if (foundFrom) params.set("foundFrom", foundFrom);
  return `/api/found-items?${params}`;
}

// 一覧の結果。key は、どの条件で取った結果かを表す（条件が変わったら古い結果を出さない）
type Result =
  | { key: string; state: "ok"; items: FoundItem[]; total: number }
  | { key: string; state: "error"; message: string };

// M01 拾得物一覧・検索の本体
export function FoundItemSearch() {
  const [values, setValues] = useState<ItemFilterValues>({});
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // 検索の文字は、打ち終わってから探す
  const typed = values.keyword ?? "";
  useEffect(() => {
    const timeout = setTimeout(() => setKeyword(typed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [typed]);

  const filters: Filters = {
    category: values.category,
    status: values.status,
    time: values.time,
    keyword,
  };
  const key = JSON.stringify([filters, reloadCount]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((body) => setCategories(body.items))
      // カテゴリが取れなくても一覧は見られるので、絞り込みの選択肢を空のままにする
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const [currentFilters] = JSON.parse(key) as [Filters, number];
    fetchApi<FoundItemList>(searchPathOf(currentFilters, 1), {
      signal: controller.signal,
    })
      .then(({ items, total }) => {
        setResult({ key, state: "ok", items, total });
        setMoreError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [key]);

  const current = result?.key === key ? result : null;

  const loadMore = useCallback(async () => {
    if (current?.state !== "ok") return;
    const [currentFilters] = JSON.parse(current.key) as [Filters, number];
    const nextPage = Math.floor(current.items.length / PAGE_SIZE) + 1;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const body = await fetchApi<FoundItemList>(
        searchPathOf(currentFilters, nextPage),
      );
      setResult((prev) =>
        prev?.key === current.key && prev.state === "ok"
          ? {
              ...prev,
              // 途中で登録が増えると、ページの境目で同じものが重なるので除く
              items: [
                ...prev.items,
                ...body.items.filter(
                  (item) => !prev.items.some((seen) => seen.id === item.id),
                ),
              ],
              total: body.total,
            }
          : prev,
      );
    } catch (error) {
      setMoreError(errorMessageOf(error));
    } finally {
      setLoadingMore(false);
    }
  }, [current]);

  return (
    <Stack gap="4" pt="4" pb="28">
      <Stack gap="2">
        <Text fontSize="sm" fontWeight="bold">
          絞り込み
        </Text>
        <ItemFilterBar
          fields={["keyword", "category", "status", "time"]}
          values={values}
          onChange={setValues}
          categories={categories}
          statusOptions={STATUS_OPTIONS}
          timeOptions={TIME_OPTIONS}
          searchPlaceholder="ブランド・メモ・場所を検索"
          size="sm"
        />
      </Stack>

      <Stack gap="3" aria-busy={!current}>
        <Text fontSize="sm" fontWeight="bold" aria-live="polite">
          {current?.state === "ok"
            ? `登録された拾得物 ${current.total}件`
            : "登録された拾得物"}
        </Text>

        {!current &&
          Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} h="114px" rounded="lg" />
          ))}

        {current?.state === "error" && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>一覧を読み込めませんでした</Alert.Title>
              <Alert.Description>{current.message}</Alert.Description>
            </Alert.Content>
            <Button
              size="xs"
              variant="outline"
              alignSelf="center"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              再読み込み
            </Button>
          </Alert.Root>
        )}

        {current?.state === "ok" && current.items.length === 0 && (
          <EmptyState
            title="拾得物が見つかりません"
            description="条件を変えて探してください。"
          />
        )}

        {current?.state === "ok" &&
          current.items.map((item) => (
            <FoundItemCard
              key={item.id}
              item={item}
              href={`/staff/found-items/${item.id}`}
            />
          ))}

        {current?.state === "ok" && current.items.length < current.total && (
          <Box>
            {moreError && (
              <Text fontSize="sm" color="red.600" mb="2">
                {moreError}
              </Text>
            )}
            <Button
              w="full"
              variant="outline"
              loading={loadingMore}
              onClick={loadMore}
            >
              もっと見る
            </Button>
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
