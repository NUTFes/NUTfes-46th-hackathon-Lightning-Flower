import { requireAdmin } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import type { PhotoCleanupResult } from "@/lib/schemas/photo";
import { removeUnusedPhotoFiles } from "@/lib/storage/photo-cleanup";

// 使われていない写真のファイルを Storage からまとめて消す（admin）。画面：A07
// 対象は found/ のファイルのうち、どの拾得物の写真にも使われておらず、作ってから 1 日たったもの
// （上げたばかりで、まだ登録していない写真は消さない）。本文はいらない
export const POST = apiHandler(async (request) => {
  await requireAdmin(request);
  const deleted = await removeUnusedPhotoFiles();
  return Response.json({ deleted } satisfies PhotoCleanupResult);
});
