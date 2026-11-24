"use client";

import { Button, chakra, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import { type SubmitEvent, useEffect, useState } from "react";
import { errorMessageOf, fetchApi } from "@/app/staff/fetch-api";
import { CategorySelect } from "@/components/CategorySelect";
import { Checkbox } from "@/components/Checkbox";
import { DateTimeField } from "@/components/DateTimeField";
import { Field } from "@/components/Field";
import { itemColorLabels } from "@/components/FoundItemDetailFields";
import { fieldErrorsOf, type FieldErrors } from "@/components/form-errors";
import { ITEM_COLORS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/constants";
import { CategoryList, type Category } from "@/lib/schemas/category";
import { type FoundItem, PatchFoundItemBody } from "@/lib/schemas/found-item";

type EditBody = Omit<PatchFoundItemBody, "photos">;

export function FoundItemEditForm({
  item,
  busy,
  onSave,
  onCancel,
}: {
  item: FoundItem;
  busy: boolean;
  onSave: (body: EditBody) => Promise<ActionResult>;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number | "">(item.category.id);
  const [color, setColor] = useState<string>(item.color);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [foundPlace, setFoundPlace] = useState(item.foundPlace);
  const [foundAt, setFoundAt] = useState(toLocalInputValue(item.foundAt));
  const [isValuable, setIsValuable] = useState(item.isValuable);
  const [memo, setMemo] = useState(item.memo ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState<string>();
  const [errors, setErrors] = useState<FieldErrors<keyof EditBody>>({});
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<unknown>("/api/categories", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setCategories(CategoryList.parse(data).items);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCategoryError(errorMessageOf(error));
      });
    return () => controller.abort();
  }, []);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const normalizedBrand = brand.trim() || null;
    const normalizedMemo = memo.trim() || null;
    // 変更した項目だけを送る。日時を編集していない場合は元の秒も保持する。
    const candidate = {
      ...(categoryId !== item.category.id && { categoryId }),
      ...(color !== item.color && { color }),
      ...(normalizedBrand !== item.brand && { brand: normalizedBrand }),
      ...(foundPlace.trim() !== item.foundPlace && {
        foundPlace: foundPlace.trim(),
      }),
      ...(foundAt !== toLocalInputValue(item.foundAt) && {
        foundAt: fromLocalInputValue(foundAt),
      }),
      ...(isValuable !== item.isValuable && { isValuable }),
      ...(normalizedMemo !== item.memo && { memo: normalizedMemo }),
    };
    const parsed = PatchFoundItemBody.safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrorsOf(parsed.error));
      setError("入力内容を確認してください。");
      return;
    }
    setErrors({});
    if (Object.keys(parsed.data).length === 0) {
      setError("変更された項目がありません。");
      return;
    }
    const result = await onSave(parsed.data);
    if (!result.ok) setError(result.error);
  }

  return (
    <chakra.form
      aria-label="拾得物の編集"
      onSubmit={submit}
      display="flex"
      flexDirection="column"
      gap="3"
    >
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
        <CategorySelect
          required
          categories={categories.length ? categories : [item.category]}
          value={categoryId}
          onChange={setCategoryId}
          disabled={busy || categories.length === 0}
          invalid={!!errors.categoryId}
          errorText={errors.categoryId}
        />
        <Field
          kind="select"
          label="色"
          required
          disabled={busy}
          invalid={!!errors.color}
          errorText={errors.color}
          control={{
            value: color,
            onChange: (event) => setColor(event.currentTarget.value),
            children: ITEM_COLORS.map((value) => (
              <option key={value} value={value}>
                {itemColorLabels[value]}
              </option>
            )),
          }}
        />
        <Field
          label="ブランド"
          disabled={busy}
          invalid={!!errors.brand}
          errorText={errors.brand}
          control={{
            value: brand,
            onChange: (event) => setBrand(event.currentTarget.value),
          }}
        />
        <Field
          label="拾得場所"
          required
          disabled={busy}
          invalid={!!errors.foundPlace}
          errorText={errors.foundPlace}
          control={{
            value: foundPlace,
            onChange: (event) => setFoundPlace(event.currentTarget.value),
          }}
        />
        <DateTimeField
          label="拾得日時（日本時間）"
          required
          disabled={busy}
          invalid={!!errors.foundAt}
          errorText={errors.foundAt}
          value={foundAt}
          onChange={setFoundAt}
        />
      </SimpleGrid>
      {categoryError && (
        <Text role="alert" fontSize="sm">
          カテゴリを読み込めませんでした。{categoryError}
        </Text>
      )}
      <Checkbox checked={isValuable} onChange={setIsValuable} disabled={busy}>
        貴重品
      </Checkbox>
      <Field
        kind="textarea"
        label="メモ"
        disabled={busy}
        invalid={!!errors.memo}
        errorText={errors.memo}
        control={{
          value: memo,
          onChange: (event) => setMemo(event.currentTarget.value),
        }}
      />
      {error && (
        <Text role="alert" color="fg.error">
          {error}
        </Text>
      )}
      <Flex gap="2">
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" colorPalette="blue" loading={busy}>
          変更を保存
        </Button>
      </Flex>
    </chakra.form>
  );
}
