import { createSupabaseServerClient } from "@/lib/supabase/server";

// guest（参加者）の判定。Supabase Auth の Cookie のセッションからユーザーを取り出す。
export type Guest = { id: string; email: string };

// ログインしていなければ null を返す（呼び出し側で 401 にする）。
// getUser() は Supabase Auth に問い合わせてトークンを検証する（Cookie の中身をそのまま信用しない）。
export async function getGuest(): Promise<Guest | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}
