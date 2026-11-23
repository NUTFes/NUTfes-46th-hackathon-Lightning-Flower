"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// guest のログアウト（Supabase Auth のセッションの Cookie を消す）
export async function signOutGuest() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
