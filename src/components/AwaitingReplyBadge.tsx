import { BadgePill } from "./BadgePill";

type AwaitingReplyBadgeProps = {
  awaiting: boolean;
  showReplied?: boolean;
};

export function AwaitingReplyBadge({
  awaiting,
  showReplied = false,
}: AwaitingReplyBadgeProps) {
  if (awaiting) return <BadgePill label="返信待ち" tone="danger" />;
  return showReplied ? <BadgePill label="返信済み" tone="neutral" /> : null;
}
