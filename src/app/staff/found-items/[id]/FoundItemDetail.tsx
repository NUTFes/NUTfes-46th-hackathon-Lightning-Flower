"use client";

import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FoundItemDetailFields } from "@/components/FoundItemDetailFields";
import { FoundItemForm } from "@/components/FoundItemForm";
import { PhotoGallery } from "@/components/PhotoGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { ValuableBadge } from "@/components/ValuableBadge";
import type { ActionResult } from "@/lib/action-result";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type { FoundItem, PatchFoundItemBody } from "@/lib/schemas/found-item";
import type { FoundItemInput } from "@/lib/schemas/form-inputs";
import { errorMessageOf, fetchApi, FetchApiError } from "../../fetch-api";
import { uploadPhoto } from "../../photo-upload";

type Result =
  | { id: string; state: "ok"; item: FoundItem }
  | { id: string; state: "error"; status?: number; message: string };

// 写真を変えたか（足した・外した・並べ替えた）。変えていなければ写真は送らない。
// 送ると、別の画面で写真を変えたあとに古い画面でメモだけを直したとき、400 になったり、足された写真が外れたりする
function photosChanged(item: FoundItem, input: FoundItemInput) {
  return (
    input.photos.length > 0 ||
    input.keepPhotoIds.length !== item.photos.length ||
    input.keepPhotoIds.some((id, index) => id !== item.photos[index].id)
  );
}

// M04 拾得物詳細の本体。表示・自分の登録の編集・削除
export function FoundItemDetail({ id }: { id: string }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  // 増やすと詳細を取り直す（削除が 409 になったときなど、状態が変わっていたとき）
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<FoundItem>(`/api/found-items/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((item) => setResult({ id, state: "ok", item }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          id,
          state: "error",
          status: error instanceof FetchApiError ? error.status : undefined,
          message: errorMessageOf(error),
        });
      });
    return () => controller.abort();
  }, [id, reloadCount]);

  // カテゴリは編集するときだけ使うので、編集を始めたときに取る
  function startEditing() {
    setNotice(null);
    setEditError(null);
    setEditing(true);
    if (categories) return;
    fetchApi<CategoryList>("/api/categories")
      .then((body) => setCategories(body.items))
      .catch((error: unknown) => {
        setEditing(false);
        setEditError(
          `カテゴリを読み込めませんでした。${errorMessageOf(error)}`,
        );
      });
  }

  const current = result?.id === id ? result : null;

  if (!current) {
    return (
      <Stack gap="4" pt="4" aria-busy="true">
        <Skeleton h="200px" rounded="lg" />
        <Skeleton h="32px" w="40%" />
        <Skeleton h="280px" rounded="lg" />
      </Stack>
    );
  }

  if (current.state === "error") {
    return (
      <Stack gap="4" pt="4">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {current.status === 404
                ? "拾得物が見つかりません"
                : "拾得物を読み込めませんでした"}
            </Alert.Title>
            <Alert.Description>
              {current.status === 404
                ? "削除されたか、URL がまちがっている可能性があります。"
                : current.message}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        <Button asChild variant="outline" w="full">
          <NextLink href="/staff">拾得物一覧へ戻る</NextLink>
        </Button>
      </Stack>
    );
  }

  const { item } = current;
  // 削除できるのは、自分の登録（admin は全部）で、受理のまま紐づけがないものだけ
  const canDelete =
    item.canEdit && item.status === "received" && item.activeMatch === null;

  async function save(
    input: FoundItemInput,
  ): Promise<ActionResult<{ id: string }>> {
    // 写真を変えたときは、残す写真の ID（並べた順）と新しく上げた写真をそのまま送る
    const body: PatchFoundItemBody = {
      categoryId: input.categoryId,
      color: input.color,
      brand: input.brand,
      foundPlace: input.foundPlace,
      foundAt: input.foundAt,
      isValuable: input.isValuable,
      memo: input.memo,
      ...(photosChanged(item, input) && {
        keepPhotoIds: input.keepPhotoIds,
        photos: input.photos,
      }),
    };
    try {
      const updated = await fetchApi<FoundItem>(
        `/api/found-items/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setResult({ id, state: "ok", item: updated });
      setEditing(false);
      setNotice("保存しました");
      return { ok: true, data: { id: updated.id } };
    } catch (error) {
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  async function remove(): Promise<ActionResult> {
    try {
      await fetchApi<void>(`/api/found-items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      // 「戻る」で削除した拾得物のページ（404）に戻らないよう、履歴を置き換える
      router.replace("/staff");
      return { ok: true };
    } catch (error) {
      // 一覧などで状態が変わっていた。詳細を取り直して、今のステータスとボタンにする
      // 取り直すと削除ボタンとダイアログが消えるので、理由は詳細の画面にも出す
      if (error instanceof FetchApiError && error.status === 409) {
        setNotice(null);
        setEditError(
          "ほかの人が状態を変えたため、削除できませんでした。今の状態を表示しています。",
        );
        setReloadCount((count) => count + 1);
      }
      return { ok: false, error: errorMessageOf(error) };
    }
  }

  if (editing) {
    return (
      <Stack gap="4" pt="4">
        <Flex align="center" justify="space-between" gap="2">
          <Heading as="h2" size="md">
            {item.displayNumber} を編集
          </Heading>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            キャンセル
          </Button>
        </Flex>
        {categories ? (
          <FoundItemForm
            mode="edit"
            categories={categories}
            defaultValues={item}
            uploadPhoto={uploadPhoto}
            action={save}
            submitLabel="保存する"
          />
        ) : (
          <Stack gap="4" aria-busy="true">
            <Skeleton h="95px" w="112px" rounded="lg" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} h="64px" rounded="lg" />
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap="4" pt="4" pb="6">
      {notice && (
        <Alert.Root status="success" role="status">
          <Alert.Indicator />
          <Alert.Title>{notice}</Alert.Title>
        </Alert.Root>
      )}

      <PhotoGallery
        photos={item.photos.map((photo, index) => ({
          id: photo.id,
          url: photo.url || photo.thumbUrl,
          alt: `${item.displayNumber} の写真 ${index + 1}`,
        }))}
      />

      <Stack gap="2">
        <Heading as="h2" fontSize="2xl" fontWeight="bold">
          {item.displayNumber}
        </Heading>
        <Flex gap="2" wrap="wrap">
          <StatusBadge kind="found" status={item.status} />
          <ValuableBadge isValuable={item.isValuable} />
        </Flex>
      </Stack>

      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        rounded="lg"
        px="4"
        py="1"
      >
        <FoundItemDetailFields item={item} />
      </Box>

      {editError && (
        <Text role="alert" fontSize="sm" color="red.600">
          {editError}
        </Text>
      )}

      {item.canEdit ? (
        <Stack gap="3">
          <Button colorPalette="blue" w="full" onClick={startEditing}>
            編集する
          </Button>
          {canDelete && (
            <ConfirmDialog
              trigger={
                <Button colorPalette="red" variant="outline" w="full">
                  削除する
                </Button>
              }
              title="この拾得物を削除しますか？"
              description={`${item.displayNumber}（${item.category.name}）を一覧から消します。元に戻せません。`}
              confirmLabel="削除する"
              action={remove}
            />
          )}
        </Stack>
      ) : (
        <Text fontSize="xs" color="gray.600" textAlign="center">
          編集・削除は、登録した人だけができます
        </Text>
      )}
    </Stack>
  );
}
