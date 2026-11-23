import { getDb } from "@/db";
import { requireGuest } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { recordConsent } from "@/lib/auth/consent";
import type { Me } from "@/lib/schemas/me";

// 個人情報の取り扱いに同意する（guest）。画面：G01 のあとのログイン・同意。
// 本文は受け取らない（同意するのは、セッションのログインしている本人だけ）。
// 返り値は GET /api/me と同じ形（画面がそのまま表示を更新できるように）
export const POST = apiHandler(async (request) => {
  // 1. 権限を確かめる（guest のみ）
  const guest = await requireGuest(request);

  // 2. guests の行を作る（あれば agreed_at を入れる）
  await recordConsent(getDb(), guest);

  return Response.json({
    role: "guest",
    email: guest.email,
    consented: true,
  } satisfies Me);
});
