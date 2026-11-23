"use client";

import type { Category } from "@/lib/schemas/category";
import { Field } from "./Field";

type CategorySelectProps = {
  categories: readonly Pick<Category, "id" | "name">[];
  value: Category["id"] | "";
  onChange: (value: Category["id"] | "") => void;
  name?: string;
  label?: string;
  includeAll?: boolean;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  errorText?: string;
};

export function CategorySelect({
  categories,
  value,
  onChange,
  name = "categoryId",
  label = "カテゴリ",
  includeAll,
  ...fieldProps
}: CategorySelectProps) {
  return (
    <Field
      kind="select"
      label={label}
      {...fieldProps}
      control={{
        name,
        value,
        onChange: (event) => {
          const id = event.currentTarget.value;
          onChange(id === "" ? "" : Number(id));
        },
        children: (
          <>
            <option value="" disabled={!includeAll}>
              {includeAll ? "すべて" : "選択してください"}
            </option>
            {categories.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </>
        ),
      }}
    />
  );
}
