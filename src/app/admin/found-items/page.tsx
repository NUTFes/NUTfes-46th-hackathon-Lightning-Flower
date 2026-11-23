"use client";

import {
  Alert,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import { EmptyState } from "@/components/EmptyState";
import { FoundItemCard } from "@/components/FoundItemCard";
import {
  ItemFilterBar,
  type ItemFilterValues,
} from "@/components/ItemFilterBar";
import { statusLabel } from "@/components/StatusBadge";
import { FOUND_STATUSES } from "@/db/enums";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/constants";
import { CategoryList } from "@/lib/schemas/category";
import { FoundItemList } from "@/lib/schemas/found-item";

const PAGE_SIZE = 18;
const STATUS_OPTIONS = FOUND_STATUSES.map((value) => ({
  value,
  label: statusLabel(value),
}));
const TIME_OPTIONS = [
  { value: "1h", label: "1時間以内" },
  { value: "3h", label: "3時間以内" },
  { value: "today", label: "今日" },
] as const;

function foundFromOf(time: string | undefined) {
  const now = new Date();
  switch (time) {
    case "1h":
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case "3h":
      return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    case "today": {
      const day = toLocalInputValue(now.toISOString()).slice(0, 10);
      return fromLocalInputValue(`${day}T00:00`);
    }
  }
  return "";
}

type Result<T> =
  | { key: string; status: "success"; data: T }
  | { key: string; status: "error"; message: string };

function useApiResult<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  delay = 0,
) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([path, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = schema.parse(
          await fetchApi<unknown>(path, { signal: controller.signal }),
        );
        if (!controller.signal.aborted) {
          setResult({ key, status: "success", data });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ key, status: "error", message: errorMessageOf(error) });
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, key, schema, delay]);

  return {
    result: result?.key === key ? result : null,
    retry: () => setAttempt((previous) => previous + 1),
  };
}

function LoadError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert.Root status="error">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      <Button variant="outline" size="sm" flexShrink={0} onClick={onRetry}>
        再試行
      </Button>
    </Alert.Root>
  );
}

export default function Page() {
  const [filters, setFilters] = useState<ItemFilterValues>({});
  const [foundFrom, setFoundFrom] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  const keyword = filters.keyword?.trim();
  if (keyword) params.set("q", keyword);
  if (filters.category) params.set("categoryId", String(filters.category));
  if (filters.status) params.set("status", filters.status);
  if (foundFrom) params.set("foundFrom", foundFrom);

  const categories = useApiResult("/api/categories", CategoryList);
  const items = useApiResult(`/api/found-items?${params}`, FoundItemList, 300);
  const result = items.result;
  const list = result?.status === "success" ? result.data : null;
  const pageCount = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;
  const filtered = Boolean(
    keyword || filters.category || filters.status || foundFrom,
  );

  function changeFilters(next: ItemFilterValues) {
    if (next.time !== filters.time) setFoundFrom(foundFromOf(next.time));
    setFilters(next);
    setPage(1);
  }

  return (
    <Stack as="main" minH="100dvh" mx="-8" p="8" gap="6" bg="gray.50">
      <Heading as="h1" size="2xl" color="gray.900">
        拾得物一覧
      </Heading>

      <Stack as="section" aria-label="拾得物の絞り込み" gap="2">
        <ItemFilterBar
          fields={["category", "status", "time", "keyword"]}
          values={filters}
          onChange={changeFilters}
          categories={
            categories.result?.status === "success"
              ? categories.result.data.items
              : []
          }
          statusOptions={STATUS_OPTIONS}
          timeOptions={TIME_OPTIONS}
          searchPlaceholder="ブランド・メモ・場所"
        />
        {categories.result?.status === "error" && (
          <LoadError
            title="カテゴリを読み込めませんでした"
            message={categories.result.message}
            onRetry={categories.retry}
          />
        )}
      </Stack>

      <Stack as="section" aria-labelledby="found-items-title" gap="6">
        <Heading id="found-items-title" as="h2" size="sm" aria-live="polite">
          {list
            ? `登録された拾得物 ${list.total.toLocaleString("ja-JP")}件`
            : "登録された拾得物"}
        </Heading>
        {!result && (
          <Stack gap="3">
            <Text role="status" fontSize="sm" color="gray.600">
              拾得物を読み込み中です…
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} h="114px" rounded="lg" />
              ))}
            </SimpleGrid>
          </Stack>
        )}
        {result?.status === "error" && (
          <LoadError
            title="拾得物一覧を読み込めませんでした"
            message={result.message}
            onRetry={items.retry}
          />
        )}
        {list && list.items.length === 0 && (
          <EmptyState
            title={
              filtered
                ? "条件に一致する拾得物がありません"
                : "表示する拾得物がありません"
            }
            description={
              filtered
                ? "キーワードや絞り込み条件を変えてください。"
                : undefined
            }
          />
        )}
        {list && list.items.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
            {list.items.map((item) => (
              <FoundItemCard
                key={item.id}
                item={item}
                href={`/admin/found-items/${item.id}`}
              />
            ))}
          </SimpleGrid>
        )}
        {list && (pageCount > 1 || page > 1) && (
          <Flex
            as="nav"
            aria-label="拾得物一覧のページ"
            justify="center"
            align="center"
            gap="3"
          >
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(Math.min(page - 1, pageCount))}
            >
              前のページ
            </Button>
            <Text fontSize="sm" aria-live="polite">
              {page} / {pageCount}
            </Text>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              次のページ
            </Button>
          </Flex>
        )}
      </Stack>
    </Stack>
  );
}
