"use client";

import {
  Button,
  Field,
  IconButton,
  Input,
  NativeSelect,
  Switch,
  Textarea,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import { LuCamera, LuX } from "react-icons/lu";
import { z } from "zod";
import { ITEM_COLORS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  fromLocalInputValue,
  isPhotoRequired,
  ITEM_COLOR_LABELS,
  MAX_PHOTOS,
  PLACE_AREAS,
  toLocalInputValue,
} from "@/lib/constants";
import type { Category } from "@/lib/schemas/category";
import type { FoundItem } from "@/lib/schemas/found-item";
import { FoundItemInput } from "@/lib/schemas/form-inputs";
import styles from "./Form.module.css";

// 入力欄の値（文字列のまま）を、Server Action に渡す FoundItemInput に変えてから確かめる
const FormSchema = z
  .object({
    photos: z.array(z.instanceof(File)),
    keepPhotoIds: z.array(z.string()),
    categoryId: z.string(),
    color: z.string(),
    brand: z.string(),
    foundPlace: z.string(),
    foundAt: z.string().min(1, "拾った時刻を入力してください"),
    isValuable: z.boolean(),
    memo: z.string(),
  })
  .transform((values) => ({
    ...values,
    categoryId: Number(values.categoryId) || 0,
    foundAt: fromLocalInputValue(values.foundAt),
    // 空文字は FoundItemInput の側で null にする
    brand: values.brand as string | null,
    memo: values.memo as string | null,
  }))
  .pipe(FoundItemInput);

type FormValues = z.input<typeof FormSchema>;

// 拾得物の登録・編集フォーム（M02 の新規、M04 の自分の分の編集、A03 の全件の編集）。
// 成功したあとの画面の移動は、action の中で redirect() する
export function FoundItemForm({
  mode,
  categories,
  defaultValues,
  action,
  submitLabel,
}: {
  mode: "create" | "edit";
  // GET /api/categories と同じもの（サーバーで取って渡す）
  categories: Category[];
  defaultValues?: Partial<FoundItem>;
  action: (data: FoundItemInput) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  // 貴重品を手で切り替えたか。切り替えるまでは、カテゴリに合わせて自動で ON/OFF する
  // （編集のときは、登録した人がすでに決めているので自動で変えない）
  const [valuableTouched, setValuableTouched] = useState(mode === "edit");
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingPhotos = defaultValues?.photos ?? [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, FoundItemInput>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      photos: [],
      keepPhotoIds: existingPhotos.map((photo) => photo.id),
      categoryId: defaultValues?.category
        ? String(defaultValues.category.id)
        : "",
      color: defaultValues?.color ?? "",
      brand: defaultValues?.brand ?? "",
      foundPlace: defaultValues?.foundPlace ?? "",
      foundAt: toLocalInputValue(
        defaultValues?.foundAt ?? new Date().toISOString(),
      ),
      isValuable: defaultValues?.isValuable ?? false,
      memo: defaultValues?.memo ?? "",
    },
  });

  const categoryId = Number(useWatch({ control, name: "categoryId" })) || null;
  const photos = useWatch({ control, name: "photos" });
  const keepPhotoIds = useWatch({ control, name: "keepPhotoIds" });
  const photoCount = photos.length + keepPhotoIds.length;
  const photoRequired = isPhotoRequired(categoryId);

  // 保存済みの場所がエリアの一覧にないとき（エリアを差し替えた後など）も選べるようにする
  const placeOptions: string[] = [...PLACE_AREAS];
  if (
    defaultValues?.foundPlace &&
    !placeOptions.includes(defaultValues.foundPlace)
  ) {
    placeOptions.unshift(defaultValues.foundPlace);
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photoCount;
    const next = [...photos, ...Array.from(files).slice(0, room)];
    setValue("photos", next, { shouldValidate: true });
  }

  const onSubmit = handleSubmit((input) => {
    setSaved(false);
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        // 新規は action が完了画面へ redirect する。編集は同じ画面に残るので知らせる
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
      {/* --- 写真 --- */}
      <Field.Root invalid={!!errors.photos} required={photoRequired}>
        <Field.Label>
          写真
          <Field.RequiredIndicator />
          <span className={styles.hint}>
            （{photoCount}/{MAX_PHOTOS} 枚）
          </span>
        </Field.Label>
        <div className={styles.photoGrid}>
          {existingPhotos
            .filter((photo) => keepPhotoIds.includes(photo.id))
            .map((photo) => (
              <div key={photo.id} className={styles.photoItem}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 署名付き URL なので next/image の最適化を通さない */}
                <img src={photo.thumbUrl || photo.url} alt="登録済みの写真" />
                <IconButton
                  aria-label="この写真を外す"
                  size="xs"
                  variant="solid"
                  colorPalette="gray"
                  className={styles.photoRemove}
                  onClick={() =>
                    setValue(
                      "keepPhotoIds",
                      keepPhotoIds.filter((id) => id !== photo.id),
                      { shouldValidate: true },
                    )
                  }
                >
                  <LuX />
                </IconButton>
              </div>
            ))}
          {photos.map((file, index) => (
            <div key={`${file.name}-${index}`} className={styles.photoItem}>
              <FilePreview file={file} />
              <IconButton
                aria-label="この写真を外す"
                size="xs"
                variant="solid"
                colorPalette="gray"
                className={styles.photoRemove}
                onClick={() =>
                  setValue(
                    "photos",
                    photos.filter((_, i) => i !== index),
                    { shouldValidate: true },
                  )
                }
              >
                <LuX />
              </IconButton>
            </div>
          ))}
          {photoCount < MAX_PHOTOS && (
            <button
              type="button"
              className={styles.photoAdd}
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
            >
              <LuCamera className={styles.photoAddIcon} />
              写真を追加
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.visuallyHidden}
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            addFiles(event.target.files);
            // 同じファイルをもう一度選んでも onChange が起きるように空にする
            event.target.value = "";
          }}
        />
        {!photoRequired && (
          <Field.HelperText>
            証明書・カード類は個人情報が写るので、写真は任意です
          </Field.HelperText>
        )}
        <Field.ErrorText>{errors.photos?.message}</Field.ErrorText>
      </Field.Root>

      {/* --- カテゴリ・色 --- */}
      <Field.Root invalid={!!errors.categoryId} required>
        <Field.Label>
          カテゴリ
          <Field.RequiredIndicator />
        </Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            className={styles.input}
            {...register("categoryId", {
              onChange: (event) => {
                if (valuableTouched) return;
                const category = categories.find(
                  (c) => c.id === Number(event.target.value),
                );
                setValue("isValuable", category?.isValuableDefault ?? false);
              },
            })}
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
        <Field.HelperText>
          いちばん広い部分の色を選んでください
        </Field.HelperText>
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

      {/* --- 場所・時刻 --- */}
      <div className={styles.row}>
        <Field.Root invalid={!!errors.foundPlace} required>
          <Field.Label>
            拾った場所
            <Field.RequiredIndicator />
          </Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              className={styles.input}
              {...register("foundPlace")}
            >
              <option value="">選んでください</option>
              {placeOptions.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Field.ErrorText>{errors.foundPlace?.message}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.foundAt} required>
          <Field.Label>
            拾った時刻
            <Field.RequiredIndicator />
          </Field.Label>
          <Input
            type="datetime-local"
            className={styles.input}
            {...register("foundAt")}
          />
          <Field.ErrorText>{errors.foundAt?.message}</Field.ErrorText>
        </Field.Root>
      </div>

      {/* --- 貴重品 --- */}
      <Controller
        control={control}
        name="isValuable"
        render={({ field }) => (
          <Switch.Root
            className={styles.switchField}
            checked={field.value}
            onCheckedChange={(details) => {
              setValuableTouched(true);
              field.onChange(details.checked);
            }}
            name={field.name}
          >
            <span className={styles.switchText}>
              <Switch.Label className={styles.switchLabel}>貴重品</Switch.Label>
              <span className={styles.hint}>
                貴重品は期間終了後に警察へ、それ以外は処分します
                {!valuableTouched &&
                  "（カテゴリに合わせて自動で切り替わります）"}
              </span>
            </span>
            <Switch.HiddenInput onBlur={field.onBlur} />
            <Switch.Control />
          </Switch.Root>
        )}
      />

      <Field.Root invalid={!!errors.memo}>
        <Field.Label>メモ（任意）</Field.Label>
        <Textarea
          className={styles.textarea}
          placeholder="例：キーホルダーが付いている、名前のシールが貼ってある"
          {...register("memo")}
        />
        <Field.ErrorText>{errors.memo?.message}</Field.ErrorText>
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

// 選んだ写真のプレビュー。object URL は img が外れたときに解放する（React 19 の ref のクリーンアップ）
function FilePreview({ file }: { file: File }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ブラウザ内の object URL なので next/image を使えない
    <img
      alt={file.name}
      ref={(img) => {
        if (!img) return;
        const url = URL.createObjectURL(file);
        img.src = url;
        return () => URL.revokeObjectURL(url);
      }}
    />
  );
}
