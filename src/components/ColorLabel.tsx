import { ITEM_COLOR_SWATCHES } from "@/lib/constants";
import type { ItemColor } from "@/lib/types";
import styles from "./ColorLabel.module.css";
import { itemColorLabels } from "./FoundItemDetailFields";

// 色の見本の丸と、色の名前
export function ColorLabel({ color }: { color: ItemColor }) {
  return (
    <span className={styles.root}>
      <span
        className={styles.swatch}
        data-color={color}
        style={{ backgroundColor: ITEM_COLOR_SWATCHES[color] }}
        aria-hidden
      />
      {itemColorLabels[color]}
    </span>
  );
}
