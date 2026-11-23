import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// src/proxy.ts から呼ぶ。guest（Supabase Auth）のセッションを確かめ、期限が近ければ更新して Cookie を書き直す。
// Server Component は Cookie を書けないので、ここで更新しておかないと、画面でセッションが切れたままになる。
// 返す response は、そのまま（か Cookie を写して）proxy の応答にする
export async function updateGuestSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // 後ろの画面・API が更新したあとのトークンを読めるように、リクエストの Cookie も書き換える
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cookie を書く応答を CDN にキャッシュさせないためのヘッダー（Cache-Control など）
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getClaims() はトークンの署名を検証し、期限が切れていればリフレッシュトークンで更新する。
  // 間に処理を挟まない（挟むと、更新したトークンを書く前に応答してしまうことがある）
  const { data, error } = await supabase.auth.getClaims();
  const loggedIn = !error && typeof data?.claims?.sub === "string";

  return { response, loggedIn };
}
