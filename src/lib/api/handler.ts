import { unstable_rethrow } from "next/navigation";
import { ApiError, errorResponse } from "./errors";

// Route Handler を包む。中で throw したエラーを、共通のエラーの JSON にして返す。
//   - ApiError    → その code と status（入力チェックの失敗は parse.ts が 400 の ApiError にする）
//   - redirect() や notFound() などの Next.js の仕組みのエラー → そのまま投げ直す
//   - それ以外    → 500 INTERNAL_ERROR（中身はログにだけ出し、レスポンスには出さない。
//                  サーバーの中での zod の検証の失敗も、サーバーの不具合なのでここに入る）
//
// 使い方：
//   export const GET = apiHandler(async (request, ctx: RouteContext<"/api/foo/[id]">) => {
//     const staff = await requireStaff(request);
//     ...
//     return Response.json(body);
//   });
export function apiHandler<Ctx>(
  handler: (request: Request, ctx: Ctx) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      unstable_rethrow(error);
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message);
      }
      console.error(error);
      return errorResponse("INTERNAL_ERROR", "サーバーでエラーが起きました");
    }
  };
}
