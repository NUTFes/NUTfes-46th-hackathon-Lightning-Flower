import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// guest のログイン（Supabase Auth）を Cookie で読み書きするクライアント。
// Route Handler・Server Component・Server Action から使う。
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component からは Cookie を書けない（Route Handler では書ける）。
            // 期限の切れたセッションは、画面の前に src/proxy.ts（updateGuestSession）で更新している
          }
        },
      },
    },
  );
}
