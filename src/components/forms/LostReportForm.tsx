"use client";

import { Button, Field, Input, NativeSelect, Textarea } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm, type Path } from "react-hook-form";
import { z } from "zod";
import { ITEM_COLORS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  fromLocalInputValue,
  ITEM_COLOR_LABELS,
  PLACE_AREAS,
  toLocalInputValue,
} from "@/lib/constants";
import type { Category } from "@/lib/schemas/category";
import { LostReportInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import styles from "./Form.module.css";

const FormSchema = z
  .object({
    categoryId: z.string(),
    color: z.string(),
    brand: z.string(),
    lostPlace: z.string(),
    lostAt: z.string().min(1, "なくした時刻を入力してください"),
    note: z.string(),
  })
  .transform((values) => ({
    ...values,
    categoryId: Number(values.categoryId) || 0,
    lostAt: fromLocalInputValue(values.lostAt),
    // 空文字は LostReportInput の側で null にする
    brand: values.brand as string | null,
    note: values.note as string | null,
  }))
  .pipe(LostReportInput);

type FormValues = z.input<typeof FormSchema>;

// 遺失物申請のフォーム（G03 の新規、G04・G05 から開く「入力情報の変更」）。
// 成功したあとの画面の移動は、action の中で redirect() する
export function LostReportForm({
  mode,
  categories,
  defaultValues,
  action,
  submitLabel,
}: {
  mode: "create" | "edit";
  categories: Category[];
  defaultValues?: Partial<LostReport>;
  action: (data: LostReportInput) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const placeListId = useId();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, LostReportInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      categoryId: defaultValues?.category
        ? String(defaultValues.category.id)
        : "",
      color: defaultValues?.color ?? "",
      brand: defaultValues?.brand ?? "",
      lostPlace: defaultValues?.lostPlace ?? "",
      // 新規は「いま」を初期値にして、だいたいの時刻に直してもらう
      lostAt: toLocalInputValue(
        defaultValues?.lostAt ?? new Date().toISOString(),
      ),
      note: defaultValues?.note ?? "",
    },
  });

  const onSubmit = handleSubmit((input) => {
    setSaved(false);
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        if (mode === "edit") setSaved(true);
        return;
      }
      setError("root", { message: result.message });
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (message) setError(field as Path<FormValues>, { message });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <Field.Root invalid={!!errors.categoryId} required>
        <Field.Label>
          なくしたもの
          <Field.RequiredIndicator />
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            className={styles.input}
            {...register("categoryId")}
          >
            <option value="">選んでください</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Field.ErrorText>{errors.categoryId?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={!!errors.color} required>
        <Field.Label>
          色
          <Field.RequiredIndicator />
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field className={styles.input} {...register("color")}>
            <option value="">選んでください</option>
            {ITEM_COLORS.map((color) => (
              <option key={color} value={color}>
                {ITEM_COLOR_LABELS[color]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Field.ErrorText>{errors.color?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={!!errors.brand}>
        <Field.Label>ブランド名（任意）</Field.Label>
        <Input
          className={styles.input}
          placeholder="例：PORTER"
          autoComplete="off"
          {...register("brand")}
        />
        <Field.ErrorText>{errors.brand?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={!!errors.lostPlace} required>
        <Field.Label>
          なくした場所
          <Field.RequiredIndicator />
        </Field.Label>
        <Input
          className={styles.input}
          list={placeListId}
          placeholder="例：模擬店エリア"
          autoComplete="off"
          {...register("lostPlace")}
        />
        <datalist id={placeListId}>
          {PLACE_AREAS.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
        <Field.HelperText>
          わからなければ、通った場所を思いつくだけ書いてください
        </Field.HelperText>
        <Field.ErrorText>{errors.lostPlace?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={!!errors.lostAt} required>
        <Field.Label>
          なくした時刻（だいたいで構いません）
          <Field.RequiredIndicator />
        </Field.Label>
        <Input
          type="datetime-local"
          className={styles.input}
          {...register("lostAt")}
        />
        <Field.ErrorText>{errors.lostAt?.message}</Field.ErrorText>
      </Field.Root>

      <Field.Root invalid={!!errors.note}>
        <Field.Label>特徴・メモ（任意）</Field.Label>
        <Textarea
          className={styles.textarea}
          placeholder="例：青いキーホルダーが付いている、中に学生証が入っている"
          {...register("note")}
        />
        <Field.ErrorText>{errors.note?.message}</Field.ErrorText>
      </Field.Root>

      {errors.root?.message && (
        <p role="alert" className={styles.error}>
          {errors.root.message}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.success}>
          保存しました
        </p>
      )}

      <div className={styles.actions}>
        <Button
          type="submit"
          colorPalette="blue"
          className={styles.submit}
          loading={pending}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
