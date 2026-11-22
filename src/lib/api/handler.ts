import { z } from "zod";
import { ApiError, errorResponse } from "./errors";

// Route Handler を包む。中で throw したエラーを、共通のエラーの JSON にして返す。
//   - ApiError    → その code と status
//   - ZodError    → 400 VALIDATION_ERROR（入力チェックの失敗）
//   - それ以外    → 500 INTERNAL_ERROR（中身はログにだけ出し、レスポンスには出さない）
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
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message);
      }
      if (error instanceof z.ZodError) {
        return errorResponse("VALIDATION_ERROR", formatZodError(error));
      }
      console.error(error);
      return errorResponse("INTERNAL_ERROR", "サーバーでエラーが起きました");
    }
  };
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join(".")}: ${issue.message}`
        : issue.message,
    )
    .join("\n");
}
