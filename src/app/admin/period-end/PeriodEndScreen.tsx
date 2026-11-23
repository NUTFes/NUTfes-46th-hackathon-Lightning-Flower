"use client";

import { Alert, Button, Flex, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { errorMessageOf, FetchApiError, fetchApi } from "@/app/staff/fetch-api";
import type { ActionResult } from "@/lib/action-result";
import type {
  BulkStatusResult,
  FoundItem,
  FoundItemList,
} from "@/lib/schemas/found-item";
import type { LostReportList } from "@/lib/schemas/lost-report";
import type { MessageBroadcastResult } from "@/lib/schemas/message";
import { ExpiryProcessor, type Tab } from "./ExpiryProcessor";
import { PeriodEndSummaryCard } from "./PeriodEndSummaryCard";

// GET /api/found-items の 1 ページの上限
const PAGE_LIMIT = 100;
// 受理の拾得物をすべて取るときの、ページ数の上限（100 件 × 50 ページ）
const MAX_PAGES = 50;
// POST /api/found-items/bulk-status で 1 回に送れる数
const BULK_LIMIT = 500;

type Data = {
  valuableItems: FoundItem[];
  nonValuableItems: FoundItem[];
  // 照合中・受け渡し待ち（申請と紐づいているので、一括の対象にしない）の数
  linkedCount: number;
  // 探し中の申請（期間終了まで見つからなかった人）の数
  recipientCount: number;
};

// 一括の対象は「受理（received）」の拾得物だけ（bulk-status の API と同じ）。すべてのページを取る
async function fetchReceivedItems(signal?: AbortSignal) {
  const items: FoundItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await fetchApi<FoundItemList>(
      `/api/found-items?status=received&page=${page}&limit=${PAGE_LIMIT}`,
      { signal },
    );
    // 途中で登録が増えると、ページの境目で同じものが重なるので除く
    const seen = new Set(items.map((item) => item.id));
    items.push(...body.items.filter((item) => !seen.has(item.id)));
    if (body.items.length < PAGE_LIMIT || items.length >= body.total) break;
  }
  return items;
}

async function loadData(signal?: AbortSignal): Promise<Data> {
  const [items, linked, searching] = await Promise.all([
    fetchReceivedItems(signal),
    fetchApi<FoundItemList>(
      "/api/found-items?status=matching,awaiting_handover&limit=1",
      { signal },
    ),
    fetchApi<LostReportList>("/api/lost-reports?status=searching&limit=1", {
      signal,
    }),
  ]);
  return {
    valuableItems: items.filter((item) => item.isValuable),
    nonValuableItems: items.filter((item) => !item.isValuable),
    linkedCount: linked.total,
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

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal)
      .then((next) => {
        setData(next);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(errorMessageOf(error));
      });
    return () => controller.abort();
  }, [reloadCount]);

  // 変えたあとに読み直す。読み直しに失敗しても、変更はできているので成功として返す
  async function refresh() {
    try {
      setData(await loadData());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessageOf(error));
    }
  }

  async function bulkUpdate(
    ids: string[],
    status: "transferred_to_police" | "disposed",
  ): Promise<ActionResult> {
    if (ids.length > BULK_LIMIT) {
      return {
        ok: false,
        error: `一度に変えられるのは ${BULK_LIMIT} 件までです。選ぶ数を減らしてください。`,
      };
    }
    try {
      await fetchApi<BulkStatusResult>(
        "/api/found-items/bulk-status",
        postJson({
          foundItemIds: ids,
          status,
        }),
      );
    } catch (error) {
      // ほかの人が先に変えた・消した拾得物があると、1 件も変わらない。一覧を読み直して選び直してもらう
      if (
        error instanceof FetchApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        await refresh();
        return {
          ok: false,
          error:
            "ほかの人が先に変えた拾得物があったので、何も変えていません。一覧を読み直したので、選び直してください。",
        };
      }
      return { ok: false, error: errorMessageOf(error) };
    }
    await refresh();
    return { ok: true };
  }

  async function broadcast(body: string): Promise<ActionResult> {
    try {
      await fetchApi<MessageBroadcastResult>(
        "/api/messages/broadcast",
        postJson({ status: "searching", body }),
      );
    } catch (error) {
      return { ok: false, error: errorMessageOf(error) };
    }
    await refresh();
    return { ok: true };
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
          recipientCount={data.recipientCount}
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
