import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { recordConsent } from "@/lib/auth/consent";
import { nameFromMetadata } from "@/lib/auth/guest";
import { CONSENT_COOKIE, loginErrorUrl, requestOrigin } from "@/lib/auth/login";
import { safeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Google でログインしたあとに戻ってくるところ。/auth/callback?code=…&next=/home
// code をセッションに替えて Cookie に入れ、ログインの画面で同意していれば guests に記録してから、next へ移る
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const code = searchParams.get("code");
  // Google の画面で「キャンセル」したときは、code の代わりに error が付いて戻ってくる
  if (!code) return NextResponse.redirect(loginErrorUrl(origin));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user.email) {
    console.error("ログインのコードをセッションに替えられませんでした:", error);
    return NextResponse.redirect(loginErrorUrl(origin));
  }

  const cookieStore = await cookies();
  if (cookieStore.get(CONSENT_COOKIE)?.value === "1") {
    cookieStore.delete({ name: CONSENT_COOKIE, path: "/auth" });
    try {
      await recordConsent(getDb(), {
        id: data.user.id,
        email: data.user.email,
        name: nameFromMetadata(data.user.user_metadata),
      });
    } catch (error) {
      // 記録できなくてもログインは済んでいる。ログインのあとの画面で、同意をもう一度求める
      console.error("ログインのときの同意を記録できませんでした:", error);
    }
  }

  return NextResponse.redirect(
    new URL(safeNextPath(searchParams.get("next")), origin),
  );
}
