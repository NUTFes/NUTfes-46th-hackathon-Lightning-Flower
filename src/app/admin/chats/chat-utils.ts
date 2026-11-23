import { itemColorLabels } from "@/components/FoundItemDetailFields";
import type { ItemColor } from "@/lib/types";

// チャットを取り直す間隔（G06 と同じ 30 秒）
export const CHAT_POLL_INTERVAL_MS = 30_000;

// after で取り直すとき、前回の最新より少し前から取る（同じ時刻のメッセージを取りこぼさないため。重なりは id で除く）
const POLL_OVERLAP_MS = 5_000;

// 「紺のイヤホン」のような申請の概要。色が「その他」のときはカテゴリだけ
export function reportTitleOf(report: {
  color: ItemColor;
  category: { name: string };
}) {
  return report.color === "other"
    ? report.category.name
    : `${itemColorLabels[report.color]}の${report.category.name}`;
}

export function pollAfterOf(latestCreatedAt: string) {
  return new Date(Date.parse(latestCreatedAt) - POLL_OVERLAP_MS).toISOString();
}

// id で重なりを除き、古い順に並べる
export function mergeMessages<T extends { id: string; createdAt: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const message of [...current, ...incoming])
    byId.set(message.id, message);
  return [...byId.values()].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
}
