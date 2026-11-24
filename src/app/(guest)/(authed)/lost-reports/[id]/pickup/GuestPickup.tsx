"use client";

import { Alert, Box, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { reportTitleOf } from "@/app/admin/chats/chat-utils";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { EmptyState } from "@/components/EmptyState";
import { HqLocationCard } from "@/components/HqLocationCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { ActionResult } from "@/lib/action-result";
import { HQ_LOCATION } from "@/lib/constants";
import type { PickupMethodInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import { pickupLabelOf } from "./pickup-label";
import { PickupMethodForm } from "./PickupMethodForm";

type Loaded =
  | { state: "loading" }
  | { state: "ok"; report: LostReport }
  | { state: "error"; status?: number; message: string };

// G07 受け取り方法の本体。本部が本人確認 OK にした「見つかったかも」の申請でだけ選べる
// （API も同じ条件。選び直しはできない）。選んだら「受け渡し待ち」になり、チャットへ戻す
export function GuestPickup({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [reloadCount, setReloadCount] = useState(0);
  const [conflict, setConflict] = useState<string | null>(null);

  const base = `/api/lost-reports/${encodeURIComponent(reportId)}`;
  const chatPath = `/lost-reports/${reportId}/chat`;

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (error instanceof FetchApiError && error.status === 401) {
        router.replace(
          `/?${new URLSearchParams({ next: `/lost-reports/${reportId}/pickup` })}`,
        );
        return true;
      }
      return false;
    },
    [router, reportId],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<LostReport>(base, { signal: controller.signal })
      .then((report) => setLoaded({ state: "ok", report }))
      .catch((error: unknown) => {
        if (controller.signal.aborted || handleUnauthorized(error)) return;
        setLoaded({
          state: "error",
          status: error instanceof FetchApiError ? error.status : undefined,
          message: errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [base, reloadCount, handleUnauthorized]);

  const choose = useCallback(
    async (input: PickupMethodInput): Promise<ActionResult> => {
      try {
        await fetchApi<LostReport>(`${base}/pickup`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ method: input.method, note: input.note }),
        });
        router.replace(chatPath);
        return { ok: true };
      } catch (error) {
        if (handleUnauthorized(error)) return { ok: false, error: "" };
        if (error instanceof FetchApiError && error.status === 409) {
          // もう選んだ・本部が紐づけを解除したなど。今の状態を出し直す。
          // 出し直すとフォームが消えるので、理由はフォームの外（conflict）にも残す
          const message =
            "今は受け取り方法を選べません。申請の状態が変わりました。チャットで本部からの連絡を確かめてください。";
          setConflict(message);
          fetchApi<LostReport>(base)
            .then((report) => setLoaded({ state: "ok", report }))
            .catch(() => {});
          return { ok: false, error: message };
        }
        return { ok: false, error: errorMessageOf(error) };
      }
    },
    [base, chatPath, router, handleUnauthorized],
  );

  if (loaded.state === "loading") {
    return (
      <Stack gap="3" aria-busy>
        <Skeleton h="72px" rounded="lg" />
        <Skeleton h="200px" rounded="lg" />
      </Stack>
    );
  }

  if (loaded.state === "error") {
    if (loaded.status === 404 || loaded.status === 400) {
      return (
        <EmptyState
          title="申請が見つかりません"
          description="ホームの「自分の申請」から開き直してください。"
        />
      );
    }
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>申請を読み込めませんでした</Alert.Title>
          <Alert.Description>{loaded.message}</Alert.Description>
          <Box mt="2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoaded({ state: "loading" });
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

  const { report } = loaded;
  const canChoose =
    report.verified && report.status === "maybe_found" && !report.pickup;

  return (
    <Stack gap="5">
      <Stack gap="1">
        <Text fontSize="xs" color="gray.600">
          {report.displayNumber}
        </Text>
        <Box display="flex" alignItems="center" gap="2" flexWrap="wrap">
          <Text fontWeight="bold" overflowWrap="anywhere">
            {reportTitleOf(report)}
          </Text>
          <StatusBadge kind="lost" status={report.status} />
        </Box>
      </Stack>

      <HqLocationCard
        label="受け取り場所"
        name={`学園祭本部（${HQ_LOCATION.name}）`}
        note="本部で、実行委員が現物をお渡しします。"
      />

      {canChoose ? (
        <Stack gap="3">
          <Text fontSize="sm" color="gray.700">
            受け取り方法を選んでください。選んだあとは変えられないので、変えたいときはチャットで本部に伝えてください。
          </Text>
          <PickupMethodForm reportId={report.id} action={choose} />
        </Stack>
      ) : (
        <Stack gap="3">
          {conflict && (
            <Alert.Root status="warning" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{conflict}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{unavailableTitleOf(report)}</Alert.Title>
              {report.pickup && (
                <Alert.Description>
                  {pickupLabelOf(report.pickup)}
                </Alert.Description>
              )}
            </Alert.Content>
          </Alert.Root>
          <Button asChild variant="outline" w="full">
            <NextLink href={chatPath}>チャットに戻る</NextLink>
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function unavailableTitleOf(report: LostReport) {
  if (report.pickup) return "受け取り方法は選び済みです";
  if (report.status === "maybe_found" && !report.verified)
    return "本部の確認が済むと、受け取り方法を選べます";
  return "この申請では、受け取り方法を選べません";
}
