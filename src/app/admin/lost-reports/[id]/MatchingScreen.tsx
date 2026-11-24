"use client";

import {
  Alert,
  Button,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import type { ActionResult } from "@/lib/action-result";
import {
  LostReportCandidates,
  LostReportForAdmin,
  LostReportIdParams,
} from "@/lib/schemas/lost-report";
import { MatchCreateBody } from "@/lib/schemas/match";
import { MatchingBoard } from "./MatchingBoard";

type Data = {
  report: LostReportForAdmin;
  candidates: LostReportCandidates["items"];
};
type LoadResult = { attempt: number } & ({ data: Data } | { error: string });

function loadError(error: unknown) {
  if (error instanceof FetchApiError && error.status === 404) {
    return "遺失物申請が見つかりません。";
  }
  return errorMessageOf(error);
}

export function MatchingScreen({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult>();
  const [notice, setNotice] = useState<string>();
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const writing = useRef(false);
  const path = `/api/lost-reports/${encodeURIComponent(id)}`;
  const validId = LostReportIdParams.safeParse({ id }).success;
  const current = result?.attempt === attempt ? result : undefined;
  const data = current && "data" in current ? current.data : undefined;

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    const options = { signal: controller.signal, cache: "no-store" } as const;
    Promise.all([
      fetchApi<unknown>(path, options).then((body) =>
        LostReportForAdmin.parse(body),
      ),
      fetchApi<unknown>(`${path}/candidates`, options).then((body) =>
        LostReportCandidates.parse(body),
      ),
    ])
      .then(([report, candidates]) => {
        if (!controller.signal.aborted) {
          setResult({
            attempt,
            data: { report, candidates: candidates.items },
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ attempt, error: loadError(error) });
      });
    return () => controller.abort();
  }, [attempt, path, validId]);

  function reload() {
    setNeedsRefresh(false);
    setAttempt((previous) => previous + 1);
  }

  async function updateMatch(
    method: "POST" | "DELETE",
    foundItemId: string,
  ): Promise<ActionResult> {
    if (writing.current || needsRefresh || !data) {
      return { ok: false, error: "画面の状態を確認してから操作してください。" };
    }
    writing.current = true;
    setNotice(undefined);
    try {
      const base = `${path}/matches`;
      const body = await fetchApi<unknown>(
        method === "POST" ? base : `${base}/${encodeURIComponent(foundItemId)}`,
        method === "POST"
          ? {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(MatchCreateBody.parse({ foundItemId })),
            }
          : { method },
      );
      LostReportForAdmin.parse(body);
      setNotice(
        method === "POST" ? "拾得物を紐づけました。" : "紐づけを解除しました。",
      );
      reload();
      return { ok: true };
    } catch (error) {
      // 応答が失われた場合も、現在の状態を読み直すまで更新を繰り返さない。
      setNeedsRefresh(true);
      return {
        ok: false,
        error:
          error instanceof FetchApiError && error.status === 404
            ? "申請または拾得物が見つかりません。画面を更新してください。"
            : errorMessageOf(error),
      };
    } finally {
      writing.current = false;
    }
  }

  return (
    <Stack
      as="main"
      minH="100dvh"
      mx={{ base: "-4", lg: "-8" }}
      p={{ base: "4", lg: "8" }}
      gap="6"
      bg="gray.50"
    >
      <Button asChild size="sm" variant="outline" alignSelf="start">
        <NextLink href="/admin/lost-reports">遺失物申請一覧へ戻る</NextLink>
      </Button>
      <Heading as="h1" size="2xl" color="gray.900">
        照合{data ? `：${data.report.displayNumber}` : ""}
      </Heading>
      {notice && (
        <Alert.Root status="success" role="status">
          <Alert.Indicator />
          <Alert.Title>{notice}</Alert.Title>
        </Alert.Root>
      )}
      {(!validId || (current && "error" in current) || needsRefresh) && (
        <Alert.Root status="error" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {needsRefresh
                ? "最新の照合情報を取得してください。"
                : "照合情報を表示できませんでした"}
            </Alert.Title>
            <Alert.Description>
              {!validId
                ? "遺失物申請が見つかりません。"
                : current && "error" in current
                  ? current.error
                  : "操作を続ける前に、申請と候補を取得し直してください。"}
            </Alert.Description>
          </Alert.Content>
          {validId && (
            <Button size="sm" variant="outline" onClick={reload}>
              再試行
            </Button>
          )}
        </Alert.Root>
      )}
      {validId && !current && (
        <Stack role="status" gap="2">
          <Text fontSize="sm">申請と照合候補を読み込み中です…</Text>
          <Skeleton h="48" rounded="lg" />
        </Stack>
      )}
      {data && (
        <MatchingBoard
          report={data.report}
          candidates={data.candidates}
          disabled={needsRefresh}
          linkAction={({ foundItemId }) => updateMatch("POST", foundItemId)}
          unlinkAction={({ foundItemId }) => updateMatch("DELETE", foundItemId)}
        />
      )}
    </Stack>
  );
}
