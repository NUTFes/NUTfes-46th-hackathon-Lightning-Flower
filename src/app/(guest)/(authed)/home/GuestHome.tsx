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
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { EmptyState } from "@/components/EmptyState";
import { LostReportCard } from "@/components/LostReportCard";
import { LIMIT_MAX } from "@/lib/schemas/common";
import type { LostReportList } from "@/lib/schemas/lost-report";

type Result =
  { state: "ok"; list: LostReportList } | { state: "error"; message: string };

// G02 ホームの本体。申請フォームへのボタンと、自分の申請一覧（GET /api/my/lost-reports）。
// 1 人の申請は多くないので、1 ページ目（上限の件数まで）だけを出す
export function GuestHome() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<LostReportList>(`/api/my/lost-reports?limit=${LIMIT_MAX}`, {
      signal: controller.signal,
    })
      .then((list) => setResult({ state: "ok", list }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 画面を開いたあとにセッションが切れた。トップでログインし直してもらう
        if (error instanceof FetchApiError && error.status === 401) {
          router.replace("/?next=/home");
          return;
        }
        setResult({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [router, reloadCount]);

  return (
    <Stack gap="6">
      <Stack gap="3" p="5" bg="blue.50" rounded="xl">
        <Stack gap="1">
          <Heading as="h2" fontSize="lg">
            落とし物をしましたか？
          </Heading>
          <Text fontSize="sm" color="gray.600">
            特徴などを入力して、実行委員に伝えます。
          </Text>
        </Stack>
        <Button asChild colorPalette="blue" size="lg" w="full">
          <NextLink href="/lost-reports/new">
            <FiPlus />
            遺失物を申請する
          </NextLink>
        </Button>
      </Stack>

      <Stack as="section" gap="3" aria-labelledby="my-reports-heading">
        <Flex align="baseline" justify="space-between">
          <Heading as="h2" id="my-reports-heading" fontSize="md">
            自分の申請
          </Heading>
          {result?.state === "ok" && (
            <Text fontSize="xs" color="gray.600">
              全{result.list.total}件
            </Text>
          )}
        </Flex>
        <MyReports
          result={result}
          onRetry={() => {
            setResult(null);
            setReloadCount((count) => count + 1);
          }}
        />
      </Stack>

      <Text fontSize="xs" color="gray.500">
        ※ 通知は届きません。アプリ内で確認してください。
      </Text>
    </Stack>
  );
}

function MyReports({
  result,
  onRetry,
}: {
  result: Result | null;
  onRetry: () => void;
}) {
  if (!result) {
    return (
      <Stack gap="2" aria-busy="true">
        <Skeleton h="88px" rounded="lg" />
        <Skeleton h="88px" rounded="lg" />
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
            <Button size="sm" variant="outline" onClick={onRetry}>
              もう一度読み込む
            </Button>
          </Box>
        </Alert.Content>
      </Alert.Root>
    );
  }

  const { items, total } = result.list;
  if (items.length === 0) {
    return (
      <EmptyState
        title="まだ申請はありません"
        description="なくした物があれば、上のボタンから申請してください。"
      />
    );
  }

  return (
    <Stack as="ul" gap="2" listStyleType="none">
      {items.map((report) => (
        <li key={report.id}>
          <LostReportCard report={report} href={`/lost-reports/${report.id}`} />
        </li>
      ))}
      {total > items.length && (
        <Text as="li" fontSize="xs" color="gray.600">
          新しい {items.length} 件を表示しています。
        </Text>
      )}
    </Stack>
  );
}
