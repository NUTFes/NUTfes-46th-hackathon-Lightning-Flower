import { requireStaff } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/parse";
import { PhotoUploadUrlsBody, type PhotoUploadUrls } from "@/lib/schemas/photo";
import { createPhotoUpload } from "@/lib/storage/photos";

// 写真の署名付きアップロード URL を発行する（member / admin）。画面：M02
// 画面はスマホで縮小した画像とサムネイルを uploadUrl / thumbUploadUrl に PUT し、
// path・thumbPath を拾得物の登録（POST /api/found-items の photos）に渡す
export const POST = apiHandler(async (request) => {
  await requireStaff(request);
  const body = await parseBody(request, PhotoUploadUrlsBody);

  const items = await Promise.all(
    Array.from({ length: body.count }, () => createPhotoUpload()),
  );

  return Response.json({ items } satisfies PhotoUploadUrls);
});
