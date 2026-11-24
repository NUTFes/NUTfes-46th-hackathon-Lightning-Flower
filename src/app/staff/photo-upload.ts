import type { ActionFailure, ActionResult } from "@/lib/action-result";
import type { FoundItemPhotoInput } from "@/lib/schemas/found-item";
import {
  PHOTO_FILE_MISSING_MESSAGE,
  type PhotoUploadUrls,
} from "@/lib/schemas/photo";
import { errorMessageOf, fetchApi, FetchApiError } from "./fetch-api";

// 拾得物の写真を、スマホで縮小してから Storage に上げる（POST /api/photos/upload-urls #17）。
// FoundItemForm の uploadPhoto に渡す（M02 の登録・M04 の編集）。
// TODO: #60（M02）の new/resize-photo.ts・FoundItemCreate の uploadPhoto と同じもの。
// 両方がマージされたら、M02 もここを使うようにして重複を消す

// Storage のバケットは 1MiB まで・JPEG/PNG/WebP だけなので、JPEG にして 1MiB に収める（supabase/config.toml）
const MAX_BYTES = 1024 * 1024;
const PHOTO_MAX_SIDE = 1600;
const THUMB_MAX_SIDE = 400;
const PHOTO_CONTENT_TYPE = "image/jpeg";

function toJpeg(
  image: ImageBitmap,
  maxSide: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("canvas が使えません"));
  // 透明な部分（PNG）は JPEG で黒くなるので、白で塗っておく
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("画像を作れませんでした")),
      PHOTO_CONTENT_TYPE,
      quality,
    ),
  );
}

// 写真とサムネイルを作る。読めない画像（HEIC を読めないブラウザなど）は reject する
async function resizePhoto(file: File): Promise<{ photo: Blob; thumb: Blob }> {
  // スマホのカメラの向き（EXIF）に合わせて回す
  const image = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    let photo = await toJpeg(image, PHOTO_MAX_SIDE, 0.82);
    // 細かい写真で 1MiB を超えたら、画質と大きさを下げて作り直す
    for (const [side, quality] of [
      [PHOTO_MAX_SIDE, 0.6],
      [1200, 0.6],
      [800, 0.5],
    ] as const) {
      if (photo.size <= MAX_BYTES) break;
      photo = await toJpeg(image, side, quality);
    }
    const thumb = await toJpeg(image, THUMB_MAX_SIDE, 0.7);
    return { photo, thumb };
  } finally {
    image.close();
  }
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

// 写真 1 枚を縮小し、サムネイルと一緒に署名付き URL へ PUT する。返したパスを API の photos に渡す
export async function uploadPhoto(
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
    } = await fetchApi<PhotoUploadUrls>("/api/photos/upload-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1 }),
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

// 拾得物の登録（POST）・編集（PATCH）に失敗したときの、FoundItemForm に返す失敗。
// 写真のファイルがない（使われていない写真をまとめて消したあと）400 は写真の欄のエラーにする。
// FoundItemForm は写真の欄のエラーで上げ済みの写真の使い回しをやめるので、押し直すと上げ直して送る
export function foundItemSaveFailureOf(error: unknown): ActionFailure {
  if (
    error instanceof FetchApiError &&
    error.status === 400 &&
    error.message === PHOTO_FILE_MISSING_MESSAGE
  ) {
    return {
      ok: false,
      error: PHOTO_FILE_MISSING_MESSAGE,
      fieldErrors: { photos: PHOTO_FILE_MISSING_MESSAGE },
    };
  }
  return { ok: false, error: errorMessageOf(error) };
}
