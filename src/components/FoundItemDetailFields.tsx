import type { FoundItem } from "@/lib/schemas/found-item";
import { DetailList, formatItemDate } from "./DetailList";

type FoundItemDetailFieldsProps = { item: FoundItem; hideFields?: string[] };

export function FoundItemDetailFields({
  item,
  hideFields = [],
}: FoundItemDetailFieldsProps) {
  const fields = [
    { key: "category", label: "カテゴリ", value: item.category.name },
    { key: "features", label: "特徴", value: item.features },
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
