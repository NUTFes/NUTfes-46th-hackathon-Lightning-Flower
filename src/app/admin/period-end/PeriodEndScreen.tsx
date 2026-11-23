"use client";

import { Alert, Button, Flex, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { errorMessageOf, FetchApiError, fetchApi } from "@/app/staff/fetch-api";
import type { ActionResult } from "@/lib/action-result";
import type {
  BulkStatusResult,
  FoundItem,
  FoundItemList,
} from "@/lib/schemas/found-item";
import type { LostReportList } from "@/lib/schemas/lost-report";
import type { MessageBroadcastResult } from "@/lib/schemas/message";
import {
  type BulkUpdateResult,
  ExpiryProcessor,
  type Tab,
} from "./ExpiryProcessor";
import { PeriodEndSummaryCard } from "./PeriodEndSummaryCard";

// GET /api/found-items の 1 ページの上限
const PAGE_LIMIT = 100;
// 受理の拾得物をすべて取るときの、ページ数の上限（100 件 × 50 ページ）
const MAX_PAGES = 50;
// POST /api/found-items/bulk-status で 1 回に送れる数
const BULK_LIMIT = 500;

const SEARCHING_PATH = "/api/lost-reports?status=searching&limit=1";

type Data = {
  valuableItems: FoundItem[];
  nonValuableItems: FoundItem[];
  // 受理の拾得物を取りきれなかった（取っている途中で減った、上限で止めた）
  incomplete: boolean;
  // 照合中・受け渡し待ち（申請と紐づいているので、一括の対象にしない）の数
  linkedCount: number;
  // 探し中の申請（期間終了まで見つからなかった人）の数
  recipientCount: number;
};

// 受理（received）の拾得物をすべてのページから取る
async function fetchReceivedItems(signal?: AbortSignal) {
  const items: FoundItem[] = [];
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchApi<FoundItemList>(
      `/api/found-items?status=received&page=${page}&limit=${PAGE_LIMIT}`,
      { signal },
    );
    total = body.total;
    // 途中で登録が増えると、ページの境目で同じものが重なるので除く
    const seen = new Set(items.map((item) => item.id));
    items.push(...body.items.filter((item) => !seen.has(item.id)));
    if (body.items.length < PAGE_LIMIT || items.length >= total) break;
  }
  // 途中で減ると、後ろのものが前のページへずれて取りこぼす。最後の total に足りなければ知らせる
  return { items, incomplete: items.length < total };
}

async function loadData(signal?: AbortSignal): Promise<Data> {
  const [received, linked, searching] = await Promise.all([
    fetchReceivedItems(signal),
    fetchApi<FoundItemList>(
      "/api/found-items?status=matching,awaiting_handover&limit=1",
      { signal },
    ),
    fetchApi<LostReportList>(SEARCHING_PATH, { signal }),
  ]);
  // 一括の対象は「受理で、有効な紐づけがない」拾得物だけ（bulk-status の API と同じ）。
  // 状態の列と食い違って紐づけが残っているものは、選んでも 409 になるので出さない
  const items = received.items.filter((item) => !item.activeMatch);
  return {
    valuableItems: items.filter((item) => item.isValuable),
    nonValuableItems: items.filter((item) => !item.isValuable),
    incomplete: received.incomplete,
    linkedCount: linked.total + (received.items.length - items.length),
    recipientCount: searching.total,
  };
}

function postJson(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// A07 期間終了処理の本体。データは API から取る
export function PeriodEndScreen() {
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [tab, setTab] = useState<Tab>("valuable");
  // 読み込みの番号。あとから始めた読み込みの結果だけを入れる（古い一覧で上書きしない）
  const loadSeq = useRef(0);

  // 操作のあとに読み直す。読み直せたかを返す
  async function load(): Promise<boolean> {
    const seq = ++loadSeq.current;
    try {
      const next = await loadData();
      if (seq === loadSeq.current) {
        setData(next);
        setLoadError(null);
      }
      return true;
    } catch (error) {
      if (seq === loadSeq.current) setLoadError(errorMessageOf(error));
      return false;
    }
  }

  // 最初と、再読み込みのボタンで reloadCount が変わったときに読む
  useEffect(() => {
    const controller = new AbortController();
    const seq = ++loadSeq.current;
    loadData(controller.signal)
      .then((next) => {
        if (seq !== loadSeq.current) return;
        setData(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || seq !== loadSeq.current) return;
        setLoadError(errorMessageOf(error));
      });
    return () => controller.abort();
  }, [reloadCount]);

  async function bulkUpdate(
    ids: string[],
    status: "transferred_to_police" | "disposed",
  ): Promise<BulkUpdateResult> {
    if (ids.length > BULK_LIMIT) {
      return {
        ok: false,
        error: `一度に変えられるのは ${BULK_LIMIT} 件までです。選ぶ数を減らしてください。`,
      };
    }
    try {
      await fetchApi<BulkStatusResult>(
        "/api/found-items/bulk-status",
        postJson({ foundItemIds: ids, status }),
      );
    } catch (error) {
      const known = error instanceof FetchApiError;
      // ほかの人が先に変えた・消した拾得物がある（1 件も変わっていない）、または
      // 通信が切れて変わったかわからない。どちらも一覧を読み直し、ダイアログを閉じて選び直してもらう
      if (!known || error.status === 404 || error.status === 409) {
        const reloaded = await load();
        const cause = known
          ? "ほかの人が先に変えた拾得物があったので、何も変えていません。"
          : "通信が切れたので、変わったかどうかわかりません。";
        return {
          ok: false,
          reselect: true,
          error: reloaded
            ? `${cause}一覧を読み直したので、選択を確かめてからもう一度操作してください。`
            : `${cause}一覧も読み直せませんでした。ページを読み込み直してください。`,
        };
      }
      return { ok: false, error: errorMessageOf(error) };
    }
    // 変えたものは先に一覧から除く（読み直しに失敗しても、一覧が合うように）。
    // 読み直しは待たない（確認ダイアログを先に閉じる）
    const changed = new Set(ids);
    const keep = (item: FoundItem) => !changed.has(item.id);
    setData(
      (prev) =>
        prev && {
          ...prev,
          valuableItems: prev.valuableItems.filter(keep),
          nonValuableItems: prev.nonValuableItems.filter(keep),
        },
    );
    void load();
    return { ok: true };
  }

  // 宛先の人数だけを取り直す（一斉送信のダイアログを開いたとき・送ったあと）
  async function refreshRecipientCount() {
    try {
      const { total } = await fetchApi<LostReportList>(SEARCHING_PATH);
      setData((prev) => prev && { ...prev, recipientCount: total });
    } catch {
      // 取れなければ前の人数のまま出す（送る宛先は API が送る時点で決める）
    }
  }

  async function broadcast(
    body: string,
  ): Promise<ActionResult<{ sent: number }>> {
    try {
      const { sent } = await fetchApi<MessageBroadcastResult>(
        "/api/messages/broadcast",
        postJson({ status: "searching", body }),
      );
      void refreshRecipientCount();
      return { ok: true, data: { sent } };
    } catch (error) {
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  return (
    <Stack gap="6">
      {loadError && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>一覧を読み込めませんでした</Alert.Title>
            <Alert.Description>{loadError}</Alert.Description>
          </Alert.Content>
          <Button
            size="xs"
            variant="outline"
            alignSelf="center"
            onClick={() => {
              setLoadError(null);
              setReloadCount((count) => count + 1);
            }}
          >
            再読み込み
          </Button>
        </Alert.Root>
      )}

      {data?.incomplete && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>一部の拾得物を読み込めていません</Alert.Title>
            <Alert.Description>
              読み込んでいるあいだに一覧が変わったか、数が多すぎました。再読み込みして、件数を確かめてください。
            </Alert.Description>
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

      <Flex gap="4" wrap="wrap">
        <PeriodEndSummaryCard
          title="貴重品"
          badge={{ label: "警察へ移管", tone: "danger" }}
          description="警察に届ける対象"
          count={data?.valuableItems.length ?? null}
          selected={tab === "valuable"}
          onShow={() => setTab("valuable")}
        />
        <PeriodEndSummaryCard
          title="貴重品以外"
          badge={{ label: "処分", tone: "neutral" }}
          description="処分を検討する対象"
          count={data?.nonValuableItems.length ?? null}
          selected={tab === "nonValuable"}
          onShow={() => setTab("nonValuable")}
        />
      </Flex>

      <Stack gap="1" fontSize="sm" color="fg.muted">
        <Text>
          対象は「受理」で、申請と紐づいていない拾得物です。1
          件だけ選べば、その拾得物だけを変えられます。
        </Text>
        {data && data.linkedCount > 0 && (
          <Text>
            照合中・受け渡し待ちの拾得物（{data.linkedCount}{" "}
            件）は、申請と紐づいているので対象に含めていません。紐づけを外すと「受理」に戻り、ここに出ます。
          </Text>
        )}
      </Stack>

      {data ? (
        <ExpiryProcessor
          valuableItems={data.valuableItems}
          nonValuableItems={data.nonValuableItems}
          bulkUpdateAction={bulkUpdate}
          broadcastAction={broadcast}
          onBroadcastOpen={refreshRecipientCount}
          recipientCount={data.recipientCount}
          maxSelection={BULK_LIMIT}
          tab={tab}
          onTabChange={setTab}
        />
      ) : (
        !loadError && (
          <Stack gap="3" aria-busy>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} h="56px" rounded="md" />
            ))}
          </Stack>
        )
      )}
    </Stack>
  );
}
