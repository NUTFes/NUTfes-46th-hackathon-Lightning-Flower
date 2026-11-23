import type { LostReport } from "@/lib/schemas/lost-report";
import { DetailList, formatItemDate } from "./DetailList";
import { itemColorLabels } from "./FoundItemDetailFields";

type LostReportDetailFieldsProps = {
  report: LostReport;
  hideFields?: string[];
};

export function LostReportDetailFields({
  report,
  hideFields = [],
}: LostReportDetailFieldsProps) {
  const fields = [
    { key: "category", label: "カテゴリ", value: report.category.name },
    { key: "color", label: "色", value: itemColorLabels[report.color] },
    { key: "brand", label: "ブランド", value: report.brand },
    { key: "lostPlace", label: "なくした場所", value: report.lostPlace },
    {
      key: "lostAt",
      label: "なくした日時",
      value: formatItemDate(report.lostAt),
    },
    { key: "note", label: "補足", value: report.note },
  ];

  return (
    <DetailList items={fields.filter(({ key }) => !hideFields.includes(key))} />
  );
}
