import type { FoundItem } from "@/lib/schemas/found-item";
import { DetailList, formatItemDate } from "./DetailList";

// 表示名は ITEM_COLORS のコメントに合わせる。
export const itemColorLabels = {
  black: "黒",
  white: "白",
  gray: "灰",
  brown: "茶",
  beige: "ベージュ",
  red: "赤",
  pink: "ピンク",
  orange: "オレンジ",
  yellow: "黄",
  green: "緑",
  blue: "青",
  navy: "紺",
  purple: "紫",
  gold: "金",
  silver: "銀",
  clear: "透明",
  other: "その他",
} satisfies Record<FoundItem["color"], string>;

type FoundItemDetailFieldsProps = { item: FoundItem; hideFields?: string[] };

export function FoundItemDetailFields({
  item,
  hideFields = [],
}: FoundItemDetailFieldsProps) {
  const fields = [
    { key: "category", label: "カテゴリ", value: item.category.name },
    { key: "color", label: "色", value: itemColorLabels[item.color] },
    { key: "brand", label: "ブランド", value: item.brand },
    { key: "foundPlace", label: "拾得場所", value: item.foundPlace },
    { key: "foundAt", label: "拾得日時", value: formatItemDate(item.foundAt) },
    {
      key: "isValuable",
      label: "貴重品",
      value: item.isValuable ? "はい" : "いいえ",
    },
    { key: "memo", label: "メモ", value: item.memo },
    {
      key: "registeredByEmail",
      label: "登録者",
      value: item.registeredByEmail,
    },
  ];

  return (
    <DetailList
      items={fields.filter(
        ({ key }) =>
          !hideFields.includes(key) &&
          !(key === "registeredByEmail" && hideFields.includes("registeredBy")),
      )}
    />
  );
}
