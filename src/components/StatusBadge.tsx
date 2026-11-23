import type { FOUND_STATUSES, LOST_STATUSES } from "@/db/enums";
import { BadgePill, type BadgeLabel } from "./BadgePill";

export type FoundItemStatus = (typeof FOUND_STATUSES)[number];
export type LostReportStatus = (typeof LOST_STATUSES)[number];

const STATUS_META = {
  received: { label: "受理", tone: "neutral" },
  matching: { label: "照合中", tone: "info" },
  awaiting_handover: { label: "受け渡し待ち", tone: "accent" },
  resolved: { label: "解決済み", tone: "success" },
  transferred_to_police: { label: "警察へ移管", tone: "danger" },
  disposed: { label: "処分", tone: "neutral" },
  searching: { label: "探し中", tone: "info" },
  maybe_found: { label: "見つかったかも", tone: "warning" },
  cancelled: { label: "取り消し済み", tone: "neutral" },
} satisfies Record<FoundItemStatus | LostReportStatus, BadgeLabel>;

// セレクトの選択肢など、バッジ以外でステータスの名前を出すときに使う
export function statusLabel(status: FoundItemStatus | LostReportStatus) {
  return STATUS_META[status].label;
}

type StatusBadgeProps = (
  | { kind: "found"; status: FoundItemStatus }
  | { kind: "lost"; status: LostReportStatus }
) & { size?: "sm" | "md" };

export function StatusBadge({ status, size }: StatusBadgeProps) {
  return <BadgePill {...STATUS_META[status]} size={size} />;
}
