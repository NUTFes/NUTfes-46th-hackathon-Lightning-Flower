import { createSupabaseServerClient } from "@/lib/supabase/server";

// guest（参加者）の判定。Supabase Auth の Cookie のセッションからユーザーを取り出す。
export type Guest = { id: string; email: string };

// ログインしていなければ null を返す（呼び出し側で 401 にする）。
// getClaims() は Cookie のアクセストークンの署名を検証してから中身を返す（中身をそのまま信用しない）。
// 非対称鍵で署名されていれば手元で検証し、チャットのポーリングのたびに Auth に問い合わせない。
export async function getGuest(): Promise<Guest | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.email !== "string") return null;
  return { id: claims.sub, email: claims.email };
}
