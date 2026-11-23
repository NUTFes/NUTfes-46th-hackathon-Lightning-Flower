"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// guest のログアウト（Supabase Auth のセッションの Cookie を消す）。
// scope: "local" で、この端末のログインだけを切る（スマホと PC の両方で使う人のため）
export async function signOutGuest() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
