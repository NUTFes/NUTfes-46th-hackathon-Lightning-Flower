"use client";

import { Alert, Button, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FoundItemForm } from "@/components/FoundItemForm";
import type { ActionResult } from "@/lib/action-result";
import type { Category, CategoryList } from "@/lib/schemas/category";
import type {
  FoundItem,
  FoundItemCreateBody,
  FoundItemPhotoInput,
} from "@/lib/schemas/found-item";
import type { FoundItemInput } from "@/lib/schemas/form-inputs";
import type { PhotoUploadUrls } from "@/lib/schemas/photo";
import { errorMessageOf, fetchApi, FetchApiError } from "../../fetch-api";
import { foundItemSaveFailureOf } from "../../photo-upload";
import { PHOTO_CONTENT_TYPE, resizePhoto } from "./resize-photo";

function postJson<T>(path: string, body: unknown) {
  return fetchApi<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function putPhoto(url: string, body: Blob) {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": PHOTO_CONTENT_TYPE },
    body,
  });
  if (!response.ok) {
    throw new FetchApiError(
      response.status,
      "写真を送れませんでした。もう一度お試しください。",
    );
  }
}

// 写真 1 枚を縮小し、サムネイルと一緒に署名付き URL へ PUT する。返したパスを登録の photos に渡す
async function uploadPhoto(
  file: File,
): Promise<ActionResult<FoundItemPhotoInput>> {
  let resized: Awaited<ReturnType<typeof resizePhoto>>;
  try {
    resized = await resizePhoto(file);
  } catch {
    return {
      ok: false,
      error: "この写真は読み込めませんでした。カメラで撮り直してください。",
    };
  }
  try {
    const {
      items: [target],
    } = await postJson<PhotoUploadUrls>("/api/photos/upload-urls", {
      count: 1,
    });
    await Promise.all([
      putPhoto(target.uploadUrl, resized.photo),
      putPhoto(target.thumbUploadUrl, resized.thumb),
    ]);
    return {
      ok: true,
      data: { path: target.path, thumbPath: target.thumbPath },
    };
  } catch (error) {
    return { ok: false, error: errorMessageOf(error) };
  }
}

type Categories =
  | { state: "loading" }
  | { state: "ok"; items: Category[] }
  | { state: "error"; message: string };

// M02 拾得物登録の本体。カテゴリを API から取ってからフォームを出す
export function FoundItemCreate() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categories>({
    state: "loading",
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchApi<CategoryList>("/api/categories", { signal: controller.signal })
      .then((body) => setCategories({ state: "ok", items: body.items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategories({ state: "error", message: errorMessageOf(error) });
      });
    return () => controller.abort();
  }, [reloadCount]);

  async function create(
    input: FoundItemInput,
  ): Promise<ActionResult<{ id: string }>> {
    const body: FoundItemCreateBody = {
      categoryId: input.categoryId,
      color: input.color,
      brand: input.brand,
      foundPlace: input.foundPlace,
      foundAt: input.foundAt,
      isValuable: input.isValuable,
      memo: input.memo,
      photos: input.photos,
    };
    try {
      const item = await postJson<FoundItem>("/api/found-items", body);
      router.push(`/staff/found-items/${item.id}/done`);
      return { ok: true, data: { id: item.id } };
    } catch (error) {
      return foundItemSaveFailureOf(error);
    }
  }

  return (
    <Stack gap="4" pt="4">
      <Text fontSize="sm" color="gray.600">
        拾った物の情報を入力します
      </Text>

      {categories.state === "loading" && (
        <Stack gap="4" aria-busy="true">
          <Skeleton h="95px" w="112px" rounded="lg" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} h="64px" rounded="lg" />
          ))}
        </Stack>
      )}

      {categories.state === "error" && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>カテゴリを読み込めませんでした</Alert.Title>
            <Alert.Description>{categories.message}</Alert.Description>
          </Alert.Content>
          <Button
            size="xs"
            variant="outline"
            alignSelf="center"
            onClick={() => {
              setCategories({ state: "loading" });
              setReloadCount((count) => count + 1);
            }}
          >
            再読み込み
          </Button>
        </Alert.Root>
      )}

      {categories.state === "ok" && (
        <FoundItemForm
          mode="create"
          categories={categories.items}
          uploadPhoto={uploadPhoto}
          action={create}
          submitLabel="登録する"
        />
      )}
    </Stack>
  );
}
