// 写真をスマホの中で縮小し、サムネイルも作る（POST /api/photos/upload-urls #17）。
// Storage のバケットは 1MiB まで・JPEG/PNG/WebP だけなので、JPEG にして 1MiB に収める（supabase/config.toml）

const MAX_BYTES = 1024 * 1024;
const PHOTO_MAX_SIDE = 1600;
const THUMB_MAX_SIDE = 400;

export const PHOTO_CONTENT_TYPE = "image/jpeg";

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

// 読めない画像（HEIC を読めないブラウザなど）は reject する
export async function resizePhoto(
  file: File,
): Promise<{ photo: Blob; thumb: Blob }> {
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
