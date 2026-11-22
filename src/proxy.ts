import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth/staff";

// /staff（member）と /admin（admin）の画面に入る前に、Cloudflare Access の JWT を確かめる。
// クライアント側の画面遷移（RSC のリクエスト）も含め、すべてのリクエストがここを通る。
// 失敗したら、401 / 403 の説明のページをここで返す（URL はそのまま）。
//
// これは画面の入口の守り。データは API（src/app/api）から取り、API で requireStaff などで必ず確かめる。
// ページ（Server Component）や Server Action から DB を直接読まない（ここを通らない経路ができるため）。
export async function proxy(request: NextRequest) {
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

  if (request.nextUrl.pathname.startsWith("/admin") && staff.role !== "admin") {
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
  // :path* は 0 個以上なので、/staff・/admin そのものも含む
  matcher: ["/staff/:path*", "/admin/:path*"],
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
