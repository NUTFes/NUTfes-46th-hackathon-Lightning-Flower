"use client";

import { Button, Switch } from "@chakra-ui/react";
import { type SubmitEvent, useRef, useState, useTransition } from "react";
import { ITEM_COLORS } from "@/db/enums";
import type { ActionResult } from "@/lib/action-result";
import {
  fromLocalInputValue,
  isPhotoRequired,
  MAX_PHOTOS,
  PLACE_AREAS,
  toLocalInputValue,
} from "@/lib/constants";
import type { Category } from "@/lib/schemas/category";
import type { FoundItem, FoundItemPhotoInput } from "@/lib/schemas/found-item";
import {
  FoundItemFields,
  FoundItemInput,
  photoCountError,
} from "@/lib/schemas/form-inputs";
import { CategorySelect } from "./CategorySelect";
import { DateTimeField } from "./DateTimeField";
import { Field } from "./Field";
import styles from "./Form.module.css";
import { fieldErrorsOf, type FieldErrors } from "./form-errors";
import { itemColorLabels } from "./FoundItemDetailFields";
import type { Photo } from "./ItemThumbnail";
import { PhotoUploader } from "./PhotoUploader";

type Key = keyof FoundItemInput;

// 拾得物の登録・編集フォーム（M02 の新規、M04 の自分の分の編集、A03 の全件の編集）。
// 送るときは、新しく足した写真を uploadPhoto で先に Storage に上げ、そのパスを action に渡す。
// 新規で成功したあとの画面の移動は、action の中で router.push() する。
// 移り終わるまでボタンを押せないままにする（await のあとの push は transition に入らず、pending が先に終わるため）
export function FoundItemForm({
  mode,
  categories,
  defaultValues,
  uploadPhoto,
  action,
  submitLabel,
  replacePhotosOnly = false,
}: {
  mode: "create" | "edit";
  // GET /api/categories で取ったもの
  categories: Category[];
  defaultValues?: Partial<FoundItem>;
  uploadPhoto: (file: File) => Promise<ActionResult<FoundItemPhotoInput>>;
  action: (input: FoundItemInput) => Promise<ActionResult<{ id: string }>>;
  submitLabel: string;
  // 登録済みの写真が残っているあいだは、写真を足せないようにする（撮り直すときは全部外してから）。
  // PATCH の photos は丸ごと置き換えで、今の写真のパスを送れないため、上げる前に止める。
  // TODO: PATCH が残す写真を ID（keepPhotoIds）で受け取れるようになったら外す
  replacePhotosOnly?: boolean;
}) {
  const [photos, setPhotos] = useState<(Photo | File)[]>(() =>
    (defaultValues?.photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.thumbUrl || photo.url,
      alt: "登録済みの写真",
    })),
  );
  const [categoryId, setCategoryId] = useState<number | "">(
    defaultValues?.category?.id ?? "",
  );
  const [color, setColor] = useState<string>(defaultValues?.color ?? "");
  const [brand, setBrand] = useState(defaultValues?.brand ?? "");
  const [foundPlace, setFoundPlace] = useState(defaultValues?.foundPlace ?? "");
  const [foundAt, setFoundAt] = useState(
    defaultValues?.foundAt ? toLocalInputValue(defaultValues.foundAt) : "",
  );
  const [isValuable, setIsValuable] = useState(
    defaultValues?.isValuable ?? false,
  );
  // 貴重品を手で切り替えたか。切り替えるまでは、カテゴリに合わせて自動で ON/OFF する
  // （編集のときは、登録した人がすでに決めているので自動で変えない）
  const [valuableTouched, setValuableTouched] = useState(mode === "edit");
  const [memo, setMemo] = useState(defaultValues?.memo ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Key>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 新規の登録が済み、完了画面へ移っているところ。もう一度押して二重に登録しないようにする
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  // 上げ終わった写真。保存に失敗して送り直すときに、同じ写真をもう一度上げないように使い回す
  // 保存しなかったときに Storage に残る写真は、A07 でまとめて消す（#64）。
  // TODO(#64): 編集で外した写真のファイルは、PATCH がその場で消すようにする
  const uploadedRef = useRef(new Map<File, FoundItemPhotoInput>());
  const busy = pending || uploading || submitted;

  // 保存済みの場所がエリアの一覧にないとき（エリアを差し替えた後など）も選べるようにする
  const placeOptions: string[] = [...PLACE_AREAS];
  if (
    defaultValues?.foundPlace &&
    !placeOptions.includes(defaultValues.foundPlace)
  ) {
    placeOptions.unshift(defaultValues.foundPlace);
  }

  function changeCategory(id: number | "") {
    setCategoryId(id);
    if (valuableTouched) return;
    const category = categories.find((c) => c.id === id);
    setIsValuable(category?.isValuableDefault ?? false);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const files = photos.filter((photo) => photo instanceof File);
    const keepPhotoIds = photos.flatMap((photo) =>
      photo instanceof File ? [] : [photo.id],
    );
    const values = {
      keepPhotoIds,
      categoryId: categoryId === "" ? undefined : categoryId,
      color,
      brand,
      foundPlace,
      foundAt: fromLocalInputValue(foundAt),
      isValuable,
      memo,
    };

    // 写真を上げる前に、ほかの項目と写真の枚数を確かめる
    const checked = FoundItemFields.omit({ photos: true }).safeParse(values);
    const errors: FieldErrors<Key> = checked.success
      ? {}
      : fieldErrorsOf(checked.error);
    const photoError =
      typeof values.categoryId === "number"
        ? photoCountError(photos.length, values.categoryId)
        : null;
    if (photoError) errors.photos = photoError;
    setFieldErrors(errors);
    if (!checked.success || photoError) return;

    startTransition(async () => {
      setUploading(true);
      const uploaded: FoundItemPhotoInput[] = [];
      try {
        for (const file of files) {
          const cached = uploadedRef.current.get(file);
          if (cached) {
            uploaded.push(cached);
            continue;
          }
          const result = await uploadPhoto(file);
          if (!result.ok) {
            setFieldErrors({ photos: result.error });
            return;
          }
          uploadedRef.current.set(file, result.data);
          uploaded.push(result.data);
        }
      } catch {
        setFieldErrors({
          photos: "写真を送れませんでした。もう一度お試しください",
        });
        return;
      } finally {
        setUploading(false);
      }

      const parsed = FoundItemInput.safeParse({ ...values, photos: uploaded });
      if (!parsed.success) {
        setFieldErrors(fieldErrorsOf(parsed.error));
        return;
      }
      const result = await action(parsed.data);
      if (result.ok) {
        // 新規は action が完了画面へ移る。編集は同じ画面に残るので知らせる
        if (mode === "edit") setSaved(true);
        else setSubmitted(true);
        return;
      }
      // 写真の欄のエラー（写真のファイルがない、など）なら、上げ済みの写真を使い回さず、次に送るときに上げ直す
      if (result.fieldErrors?.photos) uploadedRef.current.clear();
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  }

  const photoRequired =
    typeof categoryId !== "number" || isPhotoRequired(categoryId);
  const photosLocked =
    replacePhotosOnly && photos.some((photo) => !(photo instanceof File));

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <PhotoUploader
        value={photos}
        onChange={(next) => {
          setPhotos(next);
          setFieldErrors((previous) => ({ ...previous, photos: undefined }));
        }}
        // 足せないときは、今の枚数を上限にして「写真を追加」を出さない
        max={photosLocked ? photos.length : MAX_PHOTOS}
        required={photoRequired}
        requiredHint={
          photosLocked
            ? "今の写真を残したまま、写真を足すことはできません。撮り直すときは、今の写真をすべて外してください"
            : photoRequired
              ? undefined
              : "証明書・カード類は個人情報が写るので、写真は任意です"
        }
        uploading={uploading}
        disabled={busy}
        error={fieldErrors.photos}
      />

      <CategorySelect
        categories={categories}
        value={categoryId}
        onChange={changeCategory}
        required
        disabled={busy}
        invalid={!!fieldErrors.categoryId}
        errorText={fieldErrors.categoryId}
      />

      <Field
        kind="select"
        label="色"
        required
        disabled={busy}
        invalid={!!fieldErrors.color}
        errorText={fieldErrors.color}
        helperText="いちばん広い部分の色を選んでください"
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
        label="ブランド名（任意）"
        disabled={busy}
        invalid={!!fieldErrors.brand}
        errorText={fieldErrors.brand}
        control={{
          name: "brand",
          value: brand,
          onChange: (event) => setBrand(event.currentTarget.value),
          placeholder: "例：PORTER",
          autoComplete: "off",
        }}
      />

      <div className={styles.row}>
        <Field
          kind="select"
          label="拾った場所"
          required
          disabled={busy}
          invalid={!!fieldErrors.foundPlace}
          errorText={fieldErrors.foundPlace}
          control={{
            name: "foundPlace",
            value: foundPlace,
            onChange: (event) => setFoundPlace(event.currentTarget.value),
            children: (
              <>
                <option value="" disabled>
                  選択してください
                </option>
                {placeOptions.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </>
            ),
          }}
        />

        <DateTimeField
          label="拾った時刻"
          name="foundAt"
          required
          // 新規は拾ってすぐ登録する想定なので「いま」を入れておく
          defaultNow={mode === "create"}
          disabled={busy}
          value={foundAt}
          onChange={setFoundAt}
          invalid={!!fieldErrors.foundAt}
          errorText={fieldErrors.foundAt}
        />
      </div>

      <Switch.Root
        className={styles.switchField}
        checked={isValuable}
        disabled={busy}
        onCheckedChange={(details) => {
          setValuableTouched(true);
          setIsValuable(details.checked);
        }}
        name="isValuable"
      >
        <span className={styles.switchText}>
          <Switch.Label className={styles.switchLabel}>貴重品</Switch.Label>
          <span className={styles.hint}>
            貴重品は期間終了後に警察へ、それ以外は処分します
            {!valuableTouched && "（カテゴリに合わせて自動で切り替わります）"}
          </span>
        </span>
        <Switch.HiddenInput />
        <Switch.Control />
      </Switch.Root>

      <Field
        kind="textarea"
        label="メモ（任意）"
        disabled={busy}
        invalid={!!fieldErrors.memo}
        errorText={fieldErrors.memo}
        control={{
          name: "memo",
          value: memo,
          onChange: (event) => setMemo(event.currentTarget.value),
          placeholder: "例：キーホルダーが付いている、名前のシールが貼ってある",
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
        <Button
          type="submit"
          colorPalette="blue"
          className={styles.submit}
          loading={busy}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
