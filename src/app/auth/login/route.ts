import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  isGuestProvider,
  loginErrorUrl,
  redirectNoStore,
  requestOrigin,
} from "@/lib/auth/login";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// guest のログインを始める（G01 のログインのボタン）。/auth/login?provider=google&next=/home&consent=1
// Supabase Auth で OAuth の URL を作り（PKCE の code verifier は Cookie に入る）、Google へ移る。
// Google のあとは /auth/callback に戻る
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const provider = searchParams.get("provider");
  if (!isGuestProvider(provider)) {
    return redirectNoStore(loginErrorUrl(origin));
  }

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", safeNextPath(searchParams.get("next")));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.error("OAuth のログインを始められませんでした:", error);
    return redirectNoStore(loginErrorUrl(origin));
  }

  // 同意のチェックは、このサイトの画面から押したときだけ受け取る。
  // ほかのサイトに置いたリンク（consent=1 付き）から来たときは、同意したことにしない
  // （Google にログイン済みだと、本人が同意の文を見ないまま、ログインまで進んでしまうため）。
  // 受け取らなかったときは、ログインのあとの画面で同意を求める
  const cookieStore = await cookies();
  if (
    searchParams.get("consent") === "1" &&
    request.headers.get("sec-fetch-site") === "same-origin"
  ) {
    cookieStore.set(CONSENT_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge: CONSENT_COOKIE_MAX_AGE,
    });
  } else {
    cookieStore.delete({ name: CONSENT_COOKIE, path: "/auth" });
  }

  return redirectNoStore(data.url);
}
