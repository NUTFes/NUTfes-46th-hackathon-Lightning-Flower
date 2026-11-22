import type { ErrorCode, ErrorResponse } from "@/lib/schemas/error";

// API のエラー。Route Handler の中で throw すると、apiHandler が
// { error: { code, message } } の形の JSON にして返す（設計仕様「API設計」の共通ルール）。
const statusOf: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string) =>
  new ApiError("VALIDATION_ERROR", message);
export const unauthorized = (message = "ログインしてください") =>
  new ApiError("UNAUTHORIZED", message);
export const forbidden = (message = "この操作をする権限がありません") =>
  new ApiError("FORBIDDEN", message);
export const notFound = (message = "見つかりません") =>
  new ApiError("NOT_FOUND", message);
// 今の状態ではできない操作（状態が期待と違うときなど）
export const conflict = (message: string) => new ApiError("CONFLICT", message);

export function errorResponse(code: ErrorCode, message: string) {
  return Response.json({ error: { code, message } } satisfies ErrorResponse, {
    status: statusOf[code],
  });
}
