"use client";

import { Box, Flex } from "@chakra-ui/react";
import type { Category } from "@/lib/schemas/category";
import type { FoundItemStatus, LostReportStatus } from "./StatusBadge";
import { FilterDropdown, type FilterOption } from "./FilterDropdown";
import { SearchField } from "./SearchField";

type FilterField = "category" | "time" | "status" | "keyword";
type Status = FoundItemStatus | LostReportStatus;

export type ItemFilterValues = {
  category?: Category["id"] | "";
  time?: string;
  status?: Status | "";
  keyword?: string;
};

type ItemFilterBarProps = {
  fields: readonly FilterField[];
  values: ItemFilterValues;
  onChange: (values: ItemFilterValues) => void;
  categories?: readonly Pick<Category, "id" | "name">[];
  timeOptions?: readonly FilterOption[];
  statusOptions?: readonly { value: Status; label: string }[];
  searchPlaceholder?: string;
  size?: "sm" | "md";
};

export function ItemFilterBar({
  fields,
  values,
  onChange,
  categories = [],
  timeOptions = [],
  statusOptions = [],
  searchPlaceholder = "ブランド・メモ・場所を検索",
  size = "md",
}: ItemFilterBarProps) {
  return (
    <Flex gap="2" wrap="wrap" align="center">
      {fields.map((field) => {
        switch (field) {
          case "keyword":
            return (
              <Box
                key={field}
                flexBasis={{ base: "100%", md: "220px" }}
                minW="0"
              >
                <SearchField
                  placeholder={searchPlaceholder}
                  size={size}
                  value={values.keyword ?? ""}
                  onChange={(keyword) => onChange({ ...values, keyword })}
                />
              </Box>
            );
          case "category":
            return (
              <FilterDropdown
                key={field}
                label="カテゴリ"
                size={size}
                options={categories.map(({ id, name }) => ({
                  value: String(id),
                  label: name,
                }))}
                value={String(values.category ?? "")}
                onChange={(category) =>
                  onChange({
                    ...values,
                    category: category === "" ? "" : Number(category),
                  })
                }
              />
            );
          case "time":
            return (
              <FilterDropdown
                key={field}
                label="時間"
                size={size}
                options={timeOptions}
                value={values.time ?? ""}
                onChange={(time) => onChange({ ...values, time })}
              />
            );
          case "status":
            return (
              <FilterDropdown
                key={field}
                label="ステータス"
                size={size}
                options={statusOptions}
                value={values.status ?? ""}
                onChange={(value) =>
                  onChange({
                    ...values,
                    status:
                      statusOptions.find((option) => option.value === value)
                        ?.value ?? "",
                  })
                }
              />
            );
        }
      })}
    </Flex>
  );
}
