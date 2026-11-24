"use client";

import { Button } from "@chakra-ui/react";
import {
  type ReactNode,
  type SubmitEvent,
  useId,
  useState,
  useTransition,
} from "react";
import { ITEM_COLORS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  fromLocalInputValue,
  PLACE_AREAS,
  toLocalInputValue,
} from "@/lib/constants";
import type { Category } from "@/lib/schemas/category";
import { LostReportInput } from "@/lib/schemas/form-inputs";
import type { LostReport } from "@/lib/schemas/lost-report";
import { CategorySelect } from "./CategorySelect";
import { DateTimeField } from "./DateTimeField";
import { Field } from "./Field";
import styles from "./Form.module.css";
import { itemColorLabels } from "./FoundItemDetailFields";
import { fieldErrorsOf, type FieldErrors } from "./form-errors";

type Key = keyof LostReportInput;

// 遺失物申請のフォーム（G03 の新規、G04・G05 から開く「入力情報の変更」）。
// 成功したあとの画面の移動は、action の中で redirect() する（startTransition の中から呼ぶので Next が処理する）
export function LostReportForm({
  mode,
  categories,
  defaultValues,
  action,
  submitLabel,
  notice,
  onCancel,
  cancelLabel = "やめる",
}: {
  mode: "create" | "edit";
  // GET /api/categories と同じもの（サーバーで取って渡す）
  categories: Category[];
  defaultValues?: Partial<LostReport>;
  action: (input: LostReportInput) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  // 送るボタンの上に出す注意書き
  notice?: ReactNode;
  // 渡すと、送るボタンの下に「やめる」ボタンを出す（編集を閉じるときなど）
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [categoryId, setCategoryId] = useState<number | "">(
    defaultValues?.category?.id ?? "",
  );
  const [color, setColor] = useState<string>(defaultValues?.color ?? "");
  const [brand, setBrand] = useState(defaultValues?.brand ?? "");
  const [lostPlace, setLostPlace] = useState(defaultValues?.lostPlace ?? "");
  // 新規は空欄から始める（触らずに送られて、不正確な時刻で登録されないように）
  const [lostAt, setLostAt] = useState(
    defaultValues?.lostAt ? toLocalInputValue(defaultValues.lostAt) : "",
  );
  const [note, setNote] = useState(defaultValues?.note ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Key>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const placeListId = useId();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = LostReportInput.safeParse({
      categoryId: categoryId === "" ? undefined : categoryId,
      color,
      brand,
      lostPlace,
      lostAt: fromLocalInputValue(lostAt),
      note,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const result = await action(parsed.data);
      if (result.ok) {
        if (mode === "edit") setSaved(true);
        return;
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <CategorySelect
        label="カテゴリ"
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        required
        disabled={pending}
        invalid={!!fieldErrors.categoryId}
        errorText={fieldErrors.categoryId}
      />

      <Field
        kind="select"
        label="色"
        required
        disabled={pending}
        invalid={!!fieldErrors.color}
        errorText={fieldErrors.color}
        control={{
          name: "color",
          value: color,
          onChange: (event) => setColor(event.currentTarget.value),
          children: (
            <>
              <option value="" disabled>
                選択してください
              </option>
              {ITEM_COLORS.map((value) => (
                <option key={value} value={value}>
                  {itemColorLabels[value]}
                </option>
              ))}
            </>
          ),
        }}
      />

      <Field
        label="なくした場所"
        required
        disabled={pending}
        invalid={!!fieldErrors.lostPlace}
        errorText={fieldErrors.lostPlace}
        helperText="わからなければ、通った場所を思いつくだけ書いてください"
        control={{
          name: "lostPlace",
          value: lostPlace,
          onChange: (event) => setLostPlace(event.currentTarget.value),
          list: placeListId,
          placeholder: "例：屋外ステージ周辺",
          autoComplete: "off",
        }}
      />
      <datalist id={placeListId}>
        {PLACE_AREAS.map((place) => (
          <option key={place} value={place} />
        ))}
      </datalist>

      <DateTimeField
        label="なくした日時（おおよそ）"
        name="lostAt"
        required
        disabled={pending}
        value={lostAt}
        onChange={setLostAt}
        invalid={!!fieldErrors.lostAt}
        errorText={fieldErrors.lostAt}
      />

      <Field
        label="ブランド（任意）"
        disabled={pending}
        invalid={!!fieldErrors.brand}
        errorText={fieldErrors.brand}
        control={{
          name: "brand",
          value: brand,
          onChange: (event) => setBrand(event.currentTarget.value),
          placeholder: "例：SONY",
          autoComplete: "off",
        }}
      />

      <Field
        kind="textarea"
        label="備考（任意）"
        disabled={pending}
        invalid={!!fieldErrors.note}
        errorText={fieldErrors.note}
        control={{
          name: "note",
          value: note,
          onChange: (event) => setNote(event.currentTarget.value),
          placeholder: "例：ケースに青いシールが貼ってあります",
        }}
      />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className={styles.success}>
          保存しました
        </p>
      )}

      <div className={styles.actions}>
        {notice != null && <p className={styles.hint}>{notice}</p>}
        <Button
          type="submit"
          colorPalette="blue"
          className={styles.submit}
          loading={pending}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className={styles.submit}
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
