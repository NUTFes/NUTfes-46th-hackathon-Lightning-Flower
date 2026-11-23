"use client";

import {
  Alert,
  Button,
  Flex,
  Grid,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { errorMessageOf, fetchApi, FetchApiError } from "@/app/staff/fetch-api";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatItemDate } from "@/components/DetailList";
import { FoundItemDetailFields } from "@/components/FoundItemDetailFields";
import { PhotoGallery } from "@/components/PhotoGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { ValuableBadge } from "@/components/ValuableBadge";
import type { ActionResult } from "@/lib/action-result";
import { ErrorResponse } from "@/lib/schemas/error";
import {
  FoundItem,
  FoundItemIdParams,
  FoundItemStatusBody,
  HandoverBody,
  MANUAL_FOUND_STATUSES,
} from "@/lib/schemas/found-item";
import { FoundItemEditForm } from "./FoundItemEditForm";
import { HandoverForm } from "./HandoverForm";
import { StatusChangePanel } from "./StatusChangePanel";

function itemError(error: unknown) {
  if (error instanceof FetchApiError && error.status === 404) {
    return "拾得物が見つかりません。削除された可能性があります。";
  }
  return errorMessageOf(error);
}

async function deleteItem(path: string) {
  // DELETE の成功応答は 204 で本文がない。
  const response = await fetch(path, { method: "DELETE" });
  if (response.ok) return;
  const body = ErrorResponse.safeParse(await response.json().catch(() => null));
  const messages: Record<number, string> = {
    401: "ログインが切れました。もう一度ログインしてください。",
    403: "この拾得物を削除する権限がありません。",
    409: "現在の状態では削除できません。ページを読み込み直してください。",
  };
  throw new FetchApiError(
    response.status,
    messages[response.status] ??
      (body.success
        ? body.data.error.message
        : "拾得物を削除できませんでした。"),
  );
}

export function FoundItemDetail({ id }: { id: string }) {
  const [item, setItem] = useState<FoundItem>();
  const [loadError, setLoadError] = useState<{
    message: string;
    retryable: boolean;
  }>();
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [deleted, setDeleted] = useState(false);
  const writing = useRef(false);
  const validId = FoundItemIdParams.safeParse({ id }).success;
  const path = `/api/found-items/${encodeURIComponent(id)}`;

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    fetchApi<unknown>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setItem(FoundItem.parse(data));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError({
          message: itemError(error),
          retryable: !(error instanceof FetchApiError && error.status === 404),
        });
      });
    return () => controller.abort();
  }, [path, validId, attempt]);

  async function runMutation(
    action: () => Promise<void>,
    successMessage?: string,
  ): Promise<ActionResult> {
    if (writing.current) return { ok: false, error: "別の操作を処理中です。" };
    writing.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      await action();
      setNotice(successMessage);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: itemError(error) };
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  async function save(suffix: string, method: "POST" | "PATCH", body: object) {
    const data = await fetchApi<unknown>(path + suffix, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setItem(FoundItem.parse(data));
  }

  const statusReason = item?.activeMatch
    ? "遺失物申請と紐づいているため、手動で変更できません。"
    : item && !MANUAL_FOUND_STATUSES.some((status) => status === item.status)
      ? "現在のステータスからは手動で変更できません。"
      : undefined;
  const receivedWithoutMatch = item?.status === "received" && !item.activeMatch;
  const canDelete = item?.canEdit && receivedWithoutMatch;
  const canHandover = item?.activeMatch
    ? item.status === "matching" || item.status === "awaiting_handover"
    : receivedWithoutMatch;

  return (
    <Stack as="main" minH="100dvh" mx="-8" p="8" gap="6" bg="gray.50">
      <Button asChild size="sm" variant="outline" alignSelf="start">
        <NextLink href="/admin/found-items">拾得物一覧へ戻る</NextLink>
      </Button>
      <Heading as="h1" size="2xl" color="gray.900">
        拾得物詳細{item ? `：${item.displayNumber}` : ""}
      </Heading>

      {(!validId || loadError) && (
        <Alert.Root status="error" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {loadError?.message ?? "拾得物が見つかりません。"}
            </Alert.Title>
          </Alert.Content>
          {loadError?.retryable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoadError(undefined);
                setAttempt((current) => current + 1);
              }}
            >
              再試行
            </Button>
          )}
        </Alert.Root>
      )}
      {validId && !item && !loadError && (
        <Stack gap="2" role="status">
          <Text fontSize="sm">拾得物を読み込み中です…</Text>
          <Skeleton h="200px" rounded="lg" />
        </Stack>
      )}
      {notice && (
        <Alert.Root status="success" role="status">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{notice}</Alert.Title>
          </Alert.Content>
        </Alert.Root>
      )}
      {item && !deleted && (
        <Grid
          templateColumns={{
            base: "minmax(0, 1fr)",
            xl: "minmax(0, 1fr) 400px",
          }}
          alignItems="start"
          gap="6"
        >
          <Stack
            as="section"
            aria-label="拾得物の情報"
            gap="3"
            p="5"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            rounded="lg"
          >
            <PhotoGallery photos={item.photos} />
            <Flex justify="space-between" align="center" gap="2">
              <Flex gap="2">
                <StatusBadge kind="found" status={item.status} />
                <ValuableBadge isValuable={item.isValuable} />
              </Flex>
              {item.canEdit && !editing && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setNotice(undefined);
                    setEditing(true);
                  }}
                >
                  編集する
                </Button>
              )}
            </Flex>
            {editing ? (
              <FoundItemEditForm
                item={item}
                busy={busy}
                onCancel={() => setEditing(false)}
                onSave={(body) =>
                  runMutation(async () => {
                    await save("", "PATCH", body);
                    setEditing(false);
                  }, "拾得物の情報を更新しました。")
                }
              />
            ) : (
              <>
                <FoundItemDetailFields item={item} />
                {item.handover && (
                  <Text fontSize="sm">
                    返却記録：{formatItemDate(item.handover.handedAt)}
                    {item.handover.receiverName
                      ? ` ／ ${item.handover.receiverName}`
                      : ""}
                  </Text>
                )}
                {canDelete && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="sm"
                        colorPalette="red"
                        alignSelf="start"
                        disabled={busy}
                      >
                        拾得物を削除する
                      </Button>
                    }
                    title="拾得物を削除しますか？"
                    description={`${item.displayNumber}（${item.category.name}）を一覧から削除します。`}
                    confirmLabel="削除する"
                    action={() =>
                      runMutation(async () => {
                        await deleteItem(path);
                        setDeleted(true);
                      }, "拾得物を削除しました。")
                    }
                  />
                )}
                <Text fontSize="xs" color="gray.600">
                  「受理」で遺失物申請に紐づいていない拾得物を削除できます。
                </Text>
              </>
            )}
          </Stack>
          <Stack gap="4">
            <StatusChangePanel
              itemId={id}
              currentStatus={item.status}
              linkedReport={item.activeMatch}
              allowedNext={MANUAL_FOUND_STATUSES}
              disabled={busy || editing}
              disabledReason={statusReason}
              action={({ status }) => {
                const body = FoundItemStatusBody.safeParse({ status });
                if (!body.success)
                  return Promise.resolve({
                    ok: false,
                    error: "変更先を選択してください。",
                  });
                return runMutation(() => save("/status", "PATCH", body.data));
              }}
            />
            <HandoverForm
              itemId={id}
              disabled={busy || editing}
              disabledReason={
                canHandover ? undefined : "現在の状態では返却を記録できません。"
              }
              action={({ handedAt, receiverName }) => {
                const body = HandoverBody.safeParse({ handedAt, receiverName });
                if (!body.success)
                  return Promise.resolve({
                    ok: false,
                    error: "受け取った人の名前と返却日時を確認してください。",
                  });
                return runMutation(
                  () => save("/handover", "POST", body.data),
                  "返却を記録しました。",
                );
              }}
            />
          </Stack>
        </Grid>
      )}
    </Stack>
  );
}
