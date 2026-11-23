import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/auth/login";
import { getStaff } from "@/lib/auth/staff";
import { updateGuestSession } from "@/lib/supabase/proxy";

// 画面の前に通る。クライアント側の画面遷移（RSC のリクエスト）も含め、API と静的なファイルのほかのリクエストがここを通る。
//   - /staff（member）と /admin（admin）：Cloudflare Access の JWT を確かめる。
//     失敗したら、401 / 403 の説明のページをここで返す（URL はそのまま）
//   - それ以外（guest の画面）：guest（Supabase Auth）のセッションを更新する。
//     ログインが要る guest の画面（GUEST_AUTHED_PATHS）は、ログインしていなければトップ（/）へ戻す
//
// これは画面の入口の守り。データは API（src/app/api）から取り、API で requireStaff などで必ず確かめる。
// ページ（Server Component）や Server Action から DB を直接読まない（ここを通らない経路ができるため）。
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isUnder(pathname, "/staff") || isUnder(pathname, "/admin")) {
    return staffProxy(request);
  }
  return guestProxy(request);
}

// ログインが要る guest の画面（src/app/(guest)/(authed) の下）。
// (authed) の下に画面を足したら、ここと config.matcher の両方に足す
const GUEST_AUTHED_PATHS = ["/home", "/lost-reports"];

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

async function guestProxy(request: NextRequest) {
  const { response, loggedIn } = await updateGuestSession(request);
  const { pathname, search } = request.nextUrl;
  if (loggedIn || !GUEST_AUTHED_PATHS.some((path) => isUnder(pathname, path))) {
    return response;
  }

  // ログインしていない（セッションがない・期限が切れて更新もできない）。ログインのあとに戻れるよう、元のパスを付ける
  const top = new URL("/", requestOrigin(request));
  top.searchParams.set("next", `${pathname}${search}`);
  const redirect = NextResponse.redirect(top);
  // 期限の切れたセッションを消す Cookie などを、戻す応答にも写す
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

async function staffProxy(request: NextRequest) {
  const staff = await getStaff(request.headers);
  if (!staff) {
    return authErrorPage(
      401,
      "ログインしてください",
      process.env.NODE_ENV === "development"
        ? "ローカルでは .env.local の DEV_STAFF_EMAIL にメールを入れて、make restart してください（README の「ローカルでの member / admin」）。"
        : "実行委員・本部の画面は、staff 用のアドレスから Cloudflare Access でログインして開きます。",
    );
  }

  if (isUnder(request.nextUrl.pathname, "/admin") && staff.role !== "admin") {
    return authErrorPage(
      403,
      "この画面を開く権限がありません",
      "本部のアカウントでログインし直してください。",
    );
  }

  // ログインした人ごとに中身が違うので、CDN やブラウザにキャッシュさせない
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    // 守る画面は、パスの末尾が .png などでも必ず通す（[id] には何でも入るため。
    // 下の静的なファイルを外すパターンだけだと、/admin/found-items/x.png が素通りする）
    "/staff/:path*",
    "/admin/:path*",
    "/home/:path*",
    "/lost-reports/:path*",
    // それ以外は、API と静的なファイル（_next/static・_next/image・public の画像など）のほかをすべて通す。
    // API は Route Handler の getGuest() がセッションを更新する（Route Handler は Cookie を書ける）ので、
    // ここで更新すると getClaims() が 2 回になる
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)",
  ],
};

// 401 / 403 のときに返す、説明だけの小さなページ。
// ログアウト（/cdn-cgi/access/logout）すると、Cloudflare Access で別のアカウントでログインし直せる
function authErrorPage(status: 401 | 403, title: string, description: string) {
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} | オトシル</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.7; color: #1f2328; }
p { color: #57606a; }
</style>
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<p><a href="/cdn-cgi/access/logout">ログアウトして、別のアカウントでログインする</a></p>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
