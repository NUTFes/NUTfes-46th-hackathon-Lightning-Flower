import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth/staff";

// /staff（member）と /admin（admin）の画面に入る前に、Cloudflare Access の JWT を確かめる。
// クライアント側の画面遷移（RSC のリクエスト）も含め、すべてのリクエストがここを通る。
// 失敗したら、401 / 403 のステータスで説明の画面に差し替える（URL はそのまま）。
//
// これは画面の入口の守り。データを返す API（src/app/api）では、別に requireStaff などで必ず確かめる。
export async function proxy(request: NextRequest) {
  const staff = await getStaff(request.headers);
  if (!staff) {
    return NextResponse.rewrite(new URL("/auth/unauthorized", request.url), {
      status: 401,
    });
  }

  const isAdminPage =
    request.nextUrl.pathname === "/admin" ||
    request.nextUrl.pathname.startsWith("/admin/");
  if (isAdminPage && staff.role !== "admin") {
    return NextResponse.rewrite(new URL("/auth/forbidden", request.url), {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff", "/staff/:path*", "/admin", "/admin/:path*"],
};
