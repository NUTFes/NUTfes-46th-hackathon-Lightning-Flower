"use client";

import { Button, Flex, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FoundItemCard } from "@/components/FoundItemCard";
import { LostReportDetailFields } from "@/components/LostReportDetailFields";
import { StatusBadge } from "@/components/StatusBadge";
import type { ActionResult } from "@/lib/action-result";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { MatchInput } from "@/lib/schemas/form-inputs";
import type { LostReport, LostReportForAdmin } from "@/lib/schemas/lost-report";
import styles from "./MatchingBoard.module.css";

type MatchAction = (input: MatchInput) => Promise<ActionResult>;
type Operation = {
  kind: "link" | "unlink";
  itemId: string;
  number: string;
};

const confirmation = {
  link: {
    title: "拾得物を紐づけますか？",
    label: "紐づける",
    description: "申請は「見つかったかも」、拾得物は「照合中」になります。",
  },
  unlink: {
    title: "紐づけを解除しますか？",
    label: "解除する",
    description: "申請は「探し中」に戻り、本人確認の記録も取り消されます。",
  },
};

export function MatchingBoard({
  report,
  candidates,
  linkedFoundItemId,
  linkedItem,
  chatHref,
  disabled = false,
  linkAction,
  unlinkAction,
}: {
  report: LostReport & Partial<Pick<LostReportForAdmin, "activeMatch">>;
  candidates: FoundItem[];
  linkedFoundItemId?: string;
  // 紐づけた拾得物（照合中なので candidates には出てこない）。「選択中」のカードで先頭に出す
  linkedItem?: FoundItem;
  // 紐づけたあとに開くチャット（A06）。紐づける前は出さない
  chatHref?: string;
  disabled?: boolean;
  linkAction: MatchAction;
  unlinkAction: MatchAction;
}) {
  const [operation, setOperation] = useState<Operation>();
  const activeId = report.activeMatch?.foundItemId ?? linkedFoundItemId;
  const activeNumber =
    report.activeMatch?.displayNumber ??
    candidates.find((item) => item.id === activeId)?.displayNumber;
  const canLink = !disabled && !activeId && report.status === "searching";
  const canUnlink = !disabled && !!activeId && report.status === "maybe_found";
  const dialog = operation && confirmation[operation.kind];
  const cards =
    linkedItem &&
    linkedItem.id === activeId &&
    !candidates.some((item) => item.id === linkedItem.id)
      ? [linkedItem, ...candidates]
      : candidates;
  const hasActiveCard =
    !!activeId && cards.some((item) => item.id === activeId);
  const chatLabel =
    report.status === "maybe_found" ? "本人確認へ進む" : "チャットを開く";

  function confirm(): Promise<ActionResult> {
    if (!operation)
      return Promise.resolve({ ok: false, error: "操作を選択してください。" });
    const input = { reportId: report.id, foundItemId: operation.itemId };
    if (operation.kind === "link" && canLink) return linkAction(input);
    if (operation.kind === "unlink" && canUnlink) return unlinkAction(input);
    return Promise.resolve({
      ok: false,
      error: "現在の状態では操作できません。",
    });
  }

  return (
    <div className={styles.board}>
      <section className={styles.report} aria-labelledby="matching-report">
        <Flex gap="2" align="center" justify="space-between" wrap="wrap">
          <h2 id="matching-report" className={styles.heading}>
            遺失物申請
          </h2>
          <StatusBadge kind="lost" status={report.status} />
        </Flex>
        <LostReportDetailFields report={report} />
        {activeId && (
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold">
              紐づいている拾得物
            </Text>
            <Link asChild color="blue.700">
              <NextLink href={`/admin/found-items/${activeId}`}>
                {activeNumber ?? "拾得物の詳細"}
              </NextLink>
            </Link>
            <Flex gap="2" wrap="wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={!canUnlink || !!operation}
                onClick={() =>
                  setOperation({
                    kind: "unlink",
                    itemId: activeId,
                    number: activeNumber ?? "拾得物",
                  })
                }
              >
                紐づけを解除
              </Button>
              {chatHref && !hasActiveCard && (
                <Button asChild size="sm">
                  <NextLink href={chatHref}>{chatLabel}</NextLink>
                </Button>
              )}
            </Flex>
            {report.status !== "maybe_found" && (
              <Text fontSize="xs" color="fg.muted">
                現在のステータスでは紐づけを解除できません。
              </Text>
            )}
          </Stack>
        )}
      </section>

      <section
        className={styles.candidates}
        aria-labelledby="matching-candidates"
      >
        <Flex gap="2" align="center" justify="space-between" wrap="wrap">
          <h2 id="matching-candidates" className={styles.heading}>
            同じカテゴリの拾得物候補
          </h2>
          <Text fontSize="sm" color="fg.muted">
            {candidates.length}件
          </Text>
        </Flex>
        {cards.length === 0 ? (
          <EmptyState title="同じカテゴリの拾得物候補はありません" />
        ) : (
          <div className={styles.candidateCards}>
            {cards.map((item) => (
              <FoundItemCard
                key={item.id}
                item={item}
                href={`/admin/found-items/${item.id}`}
                selected={item.id === activeId || item.id === operation?.itemId}
                actions={
                  <Stack gap="2">
                    {(item.brand || item.memo) && (
                      <Text
                        fontSize="xs"
                        color="fg.muted"
                        overflowWrap="anywhere"
                      >
                        {[item.brand, item.memo].filter(Boolean).join(" ／ ")}
                      </Text>
                    )}
                    {item.id === activeId ? (
                      chatHref && (
                        <Button asChild size="sm" alignSelf="end">
                          <NextLink href={chatHref}>
                            選択中：{chatLabel}
                          </NextLink>
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        alignSelf="end"
                        variant="outline"
                        colorPalette="blue"
                        disabled={
                          !canLink ||
                          item.status !== "received" ||
                          !!item.activeMatch ||
                          !!operation
                        }
                        onClick={() =>
                          setOperation({
                            kind: "link",
                            itemId: item.id,
                            number: item.displayNumber,
                          })
                        }
                      >
                        紐づける
                      </Button>
                    )}
                  </Stack>
                }
              />
            ))}
          </div>
        )}
        <Text fontSize="xs" color="fg.muted">
          {activeId
            ? "別の拾得物を紐づけるには、現在の紐づけを先に解除してください。"
            : report.status === "searching"
              ? "紐づけできる拾得物は1件です。紐づけ後、申請は「見つかったかも」、拾得物は「照合中」になります。"
              : "現在のステータスでは紐づけできません。"}
        </Text>
      </section>

      <ConfirmDialog
        open={!!operation}
        onOpenChange={(open) => {
          if (!open) setOperation(undefined);
        }}
        title={dialog?.title ?? ""}
        description={
          operation && dialog
            ? `${report.displayNumber} ／ ${operation.number}。 ${dialog.description}`
            : undefined
        }
        confirmLabel={dialog?.label ?? ""}
        colorPalette={operation?.kind === "unlink" ? "red" : "blue"}
        action={confirm}
      />
    </div>
  );
}
