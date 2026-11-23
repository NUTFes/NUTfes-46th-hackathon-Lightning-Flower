import { getDb } from "@/db";
import { requireGuest } from "@/lib/api/auth";
import { forbidden } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { recordConsent } from "@/lib/auth/consent";
import { isSameOriginRequest } from "@/lib/auth/login";
import type { Me } from "@/lib/schemas/me";

// 個人情報の取り扱いに同意する（guest）。画面：G01 のあとのログイン・同意。
// 本文は受け取らない（同意するのは、セッションのログインしている本人だけ）。
// 返り値は GET /api/me と同じ形（画面がそのまま表示を更新できるように）
export const POST = apiHandler(async (request) => {
  // 1. 権限を確かめる（guest のみ）
  const guest = await requireGuest(request);
  // 同意は本人の意思が要る記録なので、ほかのサイト（staff のホストなど同じサイトのサブドメインも）からは受け付けない
  if (!isSameOriginRequest(request)) {
    throw forbidden("この画面からは同意できません");
  }

  // 2. guests の行を作る（あれば agreed_at を入れる）
  await recordConsent(getDb(), guest);

  return Response.json({
    role: "guest",
    email: guest.email,
    consented: true,
  } satisfies Me);
});
