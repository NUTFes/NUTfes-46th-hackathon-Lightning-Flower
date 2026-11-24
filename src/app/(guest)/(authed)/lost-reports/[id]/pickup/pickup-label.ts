import { PICKUP_METHOD_LABELS } from "@/lib/constants";
import type { LostReport } from "@/lib/schemas/lost-report";

// 選んだ受け取り方法の表示（G06・G07）。「その他」は書いてもらった内容を出す
export function pickupLabelOf(pickup: NonNullable<LostReport["pickup"]>) {
  if (pickup.method === "other" && pickup.note) return `その他：${pickup.note}`;
  return PICKUP_METHOD_LABELS[pickup.method];
}
