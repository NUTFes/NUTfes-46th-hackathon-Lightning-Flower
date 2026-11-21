import { z } from "./zod";

// API の入出力の zod スキーマはこのフォルダに置く。ここから OpenAPI を出す。
// 共通のエラーの形（Notion の設計仕様「API設計」の共通ルール）。
export const ErrorCode = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
]);

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;
