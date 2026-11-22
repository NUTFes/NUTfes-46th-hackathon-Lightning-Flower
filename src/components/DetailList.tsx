import { DataList } from "@chakra-ui/react";
import type { ReactNode } from "react";

type DetailListProps = {
  items: { label: string; value: ReactNode }[];
  orientation?: "horizontal" | "vertical";
};

const itemDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatItemDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : itemDate.format(date);
}

export function DetailList({
  items,
  orientation = "horizontal",
}: DetailListProps) {
  return (
    <DataList.Root
      orientation={orientation}
      size="sm"
      divideY="1px"
      divideColor="gray.200"
      gap="0"
    >
      {items.map(({ label, value }, index) => (
        <DataList.Item
          key={`${label}-${index}`}
          py="2"
          gap={orientation === "horizontal" ? "3" : "1"}
          alignItems="start"
        >
          <DataList.ItemLabel
            color="gray.600"
            flexShrink={0}
            w={orientation === "horizontal" ? "24" : undefined}
          >
            {label}
          </DataList.ItemLabel>
          <DataList.ItemValue minW="0" overflowWrap="anywhere">
            {value ?? "—"}
          </DataList.ItemValue>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}
