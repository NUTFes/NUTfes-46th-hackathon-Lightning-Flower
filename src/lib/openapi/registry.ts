import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { CategoryList } from "@/lib/schemas/category";
import { ErrorResponse } from "@/lib/schemas/error";
import { HealthError, HealthOk } from "@/lib/schemas/health";
import { Me } from "@/lib/schemas/me";

// API を足したら、ここにスキーマとパスを登録する。`make openapi` で openapi.yaml を出力する。
export const registry = new OpenAPIRegistry();

// 共通のエラーの応答（パスの responses に入れる）。登録した schema を使うと $ref で参照される
const ErrorSchema = registry.register("Error", ErrorResponse);
const errorContent = { "application/json": { schema: ErrorSchema } };
const unauthorizedResponse = {
  401: { description: "ログインしていない", content: errorContent },
};
// apiHandler で包んだ API は、想定外のエラーのとき 500 INTERNAL_ERROR を返す
const serverErrorResponse = {
  500: { description: "サーバーのエラー", content: errorContent },
};

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "アプリと DB の疎通確認",
  responses: {
    200: {
      description: "アプリと DB がつながっている",
      content: { "application/json": { schema: HealthOk } },
    },
    503: {
      description: "DB につながらない",
      content: { "application/json": { schema: HealthError } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/categories",
  summary: "カテゴリ 12 種と貴重品の初期値",
  responses: {
    200: {
      description: "カテゴリの一覧（並び順どおり）",
      content: { "application/json": { schema: CategoryList } },
    },
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/me",
  summary: "ログイン中の人のロール・メール・同意済みか",
  responses: {
    200: {
      description: "ログイン中の人",
      content: { "application/json": { schema: Me } },
    },
    ...unauthorizedResponse,
    ...serverErrorResponse,
  },
});
