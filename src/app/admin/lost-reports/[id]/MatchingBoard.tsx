"use client";

import { Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FoundItemCard } from "@/components/FoundItemCard";
import { LostReportDetailFields } from "@/components/LostReportDetailFields";
import type { ActionResult } from "@/lib/action-result";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { MatchInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import styles from "./MatchingBoard.module.css";

type MatchAction = (input: MatchInput) => Promise<ActionResult>;

// 照合画面（A05）。左に遺失物申請の内容、右に同じカテゴリの拾得物を並べて、admin が目で見て紐づける
export function MatchingBoard({
  report,
  candidates,
  linkedFoundItemId,
  linkAction,
  unlinkAction,
  proceedToVerifyAction,
}: {
  report: LostReport;
  // GET /api/lost-reports/{id}/candidates の items
  candidates: FoundItem[];
  linkedFoundItemId?: string;
  linkAction: MatchAction;
  unlinkAction: MatchAction;
  proceedToVerifyAction: MatchAction;
}) {
  const router = useRouter();
  // 処理中のカード
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(action: MatchAction, foundItemId: string) {
    setError(null);
    setPendingId(foundItemId);
    startTransition(async () => {
      const result = await action({ reportId: report.id, foundItemId });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // 紐づけ済みのカードを先頭に出す
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(b.id === linkedFoundItemId) - Number(a.id === linkedFoundItemId),
  );

  return (
    <div className={styles.board}>
      <aside className={styles.report}>
        <h2 className={styles.heading}>遺失物申請</h2>
        <LostReportDetailFields report={report} />
      </aside>

      <section className={styles.candidates}>
        <div className={styles.candidatesHeader}>
          <h2 className={styles.heading}>
            候補の拾得物（{report.category.name}・{candidates.length} 件）
          </h2>
          {linkedFoundItemId && (
            <p className={styles.hint}>
              別の拾得物に紐づけるときは、先にいまの紐づけを解除してください
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        {sorted.length === 0 ? (
          <p className={styles.empty}>同じカテゴリの拾得物はまだありません</p>
        ) : (
          <div className={styles.grid}>
            {sorted.map((item) => {
              const linked = item.id === linkedFoundItemId;
              const busy = pendingId === item.id;
              const disabled = pendingId !== null && !busy;
              return (
                <FoundItemCard
                  key={item.id}
                  item={item}
                  href={`/admin/found-items/${item.id}`}
                  selected={linked}
                  actions={
                    linked ? (
                      <>
                        <Button
                          size="sm"
                          colorPalette="blue"
                          loading={busy}
                          disabled={disabled}
                          onClick={() => run(proceedToVerifyAction, item.id)}
                        >
                          本人確認へ進む
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || disabled}
                          onClick={() => run(unlinkAction, item.id)}
                        >
                          解除
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="blue"
                        loading={busy}
                        // 1 件の申請に紐づけられる拾得物は 1 件まで
                        disabled={disabled || !!linkedFoundItemId}
                        onClick={() => run(linkAction, item.id)}
                      >
                        候補に紐づける
                      </Button>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
