import { BadgePill } from "./BadgePill";

export function ValuableBadge({ isValuable }: { isValuable: boolean }) {
  return isValuable ? <BadgePill label="貴重品" tone="danger" /> : null;
}
