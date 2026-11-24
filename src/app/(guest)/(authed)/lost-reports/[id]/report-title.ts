import { itemColorLabels } from "@/components/FoundItemDetailFields";
import { CANCELLABLE_LOST_STATUSES } from "@/db/enums";
import type { LostReport } from "@/lib/schemas/lost-report";

// 申請の見出し（例：紺のイヤホン）。申請に名前の項目はないので、色とカテゴリから作る
export function reportTitle(report: Pick<LostReport, "color" | "category">) {
  if (report.color === "other") return report.category.name;
  return `${itemColorLabels[report.color]}の${report.category.name}`;
}

// 取り消せるか（POST /api/lost-reports/{id}/cancel と同じ CANCELLABLE_LOST_STATUSES で決める）
export function isCancellable(status: LostReport["status"]) {
  return (CANCELLABLE_LOST_STATUSES as readonly string[]).includes(status);
}
