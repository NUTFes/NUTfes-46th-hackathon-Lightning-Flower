import { itemColorLabels } from "@/components/FoundItemDetailFields";
import type { LostReport } from "@/lib/schemas/lost-report";

// 申請の見出し（例：紺のイヤホン）。申請に名前の項目はないので、色とカテゴリから作る
export function reportTitle(report: Pick<LostReport, "color" | "category">) {
  if (report.color === "other") return report.category.name;
  return `${itemColorLabels[report.color]}の${report.category.name}`;
}

// 取り消せるステータス（POST /api/lost-reports/{id}/cancel と同じ）
export const CANCELLABLE_STATUSES: readonly LostReport["status"][] = [
  "searching",
  "maybe_found",
  "awaiting_handover",
];
