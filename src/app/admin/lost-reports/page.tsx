"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import { EmptyState } from "@/components/EmptyState";
import { FilterDropdown } from "@/components/FilterDropdown";
import { SearchField } from "@/components/SearchField";
import { statusLabel } from "@/components/StatusBadge";
import { LOST_STATUSES } from "@/db/enums";
import { CategoryList, type Category } from "@/lib/schemas/category";
import { LostReportForAdminList } from "@/lib/schemas/lost-report";
import { LostReportTable } from "./LostReportTable";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = LOST_STATUSES.map((value) => ({
  value,
  label: statusLabel(value),
}));
const REPLY_OPTIONS = [
  { value: "true", label: "返信待ちのみ" },
  { value: "false", label: "返信待ち以外" },
];

type Result<T> = { data: T } | { error: string };

export default function Page() {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [awaitingReply, setAwaitingReply] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [categories, setCategories] = useState<Result<Category[]>>();
  const [response, setResponse] = useState<{
    path: string;
    attempt: number;
    result: Result<LostReportForAdminList>;
  }>();

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (keyword.trim()) params.set("q", keyword.trim());
  if (categoryId) params.set("categoryId", categoryId);
  if (status) params.set("status", status);
  if (awaitingReply) params.set("awaitingReply", awaitingReply);
  const path = `/api/lost-reports?${params}`;
  const result =
    response?.path === path && response.attempt === attempt
      ? response.result
      : undefined;
  const filtered = !!(keyword.trim() || categoryId || status || awaitingReply);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<unknown>("/api/categories", { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted)
          setCategories({ data: CategoryList.parse(body).items });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setCategories({ error: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [categoryAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const body = await fetchApi<unknown>(path, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = LostReportForAdminList.parse(body);
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResponse({ path, attempt, result: { data } });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResponse({
            path,
            attempt,
            result: { error: errorMessageOf(error) },
          });
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, attempt, page]);

  function changeFilter(setValue: (value: string) => void) {
    return (value: string) => {
      setValue(value);
      setPage(1);
    };
  }

  const categoryOptions =
    categories && "data" in categories
      ? categories.data.map(({ id, name }) => ({
          value: String(id),
          label: name,
        }))
      : [];

  return (
    <Stack as="main" minH="100dvh" mx="-8" p="8" gap="6" bg="gray.50">
      <Heading as="h1" size="2xl">
        遺失物申請一覧
      </Heading>
      <Flex
        role="search"
        aria-label="遺失物申請の検索と絞り込み"
        gap="2"
        align="center"
        wrap="wrap"
      >
        <Box flexBasis={{ base: "100%", md: "220px" }} minW="0">
          <SearchField
            label="キーワード検索"
            placeholder="申請番号・場所・備考"
            size="md"
            value={keyword}
            onChange={changeFilter(setKeyword)}
          />
        </Box>
        <FilterDropdown
          label="カテゴリ"
          options={categoryOptions}
          value={categoryId}
          onChange={changeFilter(setCategoryId)}
          disabled={categoryOptions.length === 0}
        />
        <FilterDropdown
          label="ステータス"
          options={STATUS_OPTIONS}
          value={status}
          onChange={changeFilter(setStatus)}
        />
        <FilterDropdown
          label="返信待ち"
          options={REPLY_OPTIONS}
          value={awaitingReply}
          onChange={changeFilter(setAwaitingReply)}
        />
      </Flex>

      {categories && "error" in categories && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>カテゴリを読み込めませんでした</Alert.Title>
            <Alert.Description>{categories.error}</Alert.Description>
          </Alert.Content>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCategories(undefined);
              setCategoryAttempt((current) => current + 1);
            }}
          >
            カテゴリを再試行
          </Button>
        </Alert.Root>
      )}

      {!result ? (
        <Stack role="status" gap="2">
          <Text fontSize="sm">遺失物申請を読み込み中です…</Text>
          <Skeleton h="48" rounded="lg" />
        </Stack>
      ) : "error" in result ? (
        <Alert.Root status="error" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>遺失物申請を読み込めませんでした</Alert.Title>
            <Alert.Description>{result.error}</Alert.Description>
          </Alert.Content>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAttempt((current) => current + 1)}
          >
            再試行
          </Button>
        </Alert.Root>
      ) : result.data.items.length === 0 ? (
        <EmptyState
          title={
            filtered
              ? "条件に一致する遺失物申請はありません"
              : "遺失物申請はありません"
          }
        />
      ) : (
        <Stack gap="4">
          <LostReportTable rows={result.data.items} />
          <Flex
            as="nav"
            aria-label="遺失物申請のページ切り替え"
            align="center"
            justify="space-between"
            gap="3"
            wrap="wrap"
          >
            <Text fontSize="sm" color="fg.muted">
              全{result.data.total}件中 {(page - 1) * PAGE_SIZE + 1}〜
              {(page - 1) * PAGE_SIZE + result.data.items.length}件
            </Text>
            <Flex align="center" gap="3">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                前へ
              </Button>
              <Text fontSize="sm">
                {page} / {Math.ceil(result.data.total / PAGE_SIZE)}
              </Text>
              <Button
                size="sm"
                variant="outline"
                disabled={page * PAGE_SIZE >= result.data.total}
                onClick={() => setPage(page + 1)}
              >
                次へ
              </Button>
            </Flex>
          </Flex>
        </Stack>
      )}
    </Stack>
  );
}
