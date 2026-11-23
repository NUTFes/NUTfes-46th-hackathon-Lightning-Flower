import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { CategoryList } from "@/lib/schemas/category";
import { ErrorResponse } from "@/lib/schemas/error";
import {
  FoundItem,
  FoundItemList,
  FoundItemListQuery,
} from "@/lib/schemas/found-item";
import { HealthError, HealthOk } from "@/lib/schemas/health";
import {
  LostReport,
  LostReportForAdmin,
  LostReportForAdminList,
  LostReportList,
  LostReportCandidates,
  LostReportIdParams,
} from "@/lib/schemas/lost-report";
import { Me } from "@/lib/schemas/me";

// API を足したら、ここにスキーマとパスを登録する。`make openapi` で openapi.yaml を出力する。
export const registry = new OpenAPIRegistry();

// 共通のエラーの応答（パスの responses に入れる）。登録した schema を使うと $ref で参照される
const ErrorSchema = registry.register("Error", ErrorResponse);
const errorContent = { "application/json": { schema: ErrorSchema } };
// parseBody・parseQuery などで入力が合わなかったとき
const badRequestResponse = {
  400: { description: "入力が正しくない", content: errorContent },
};
const unauthorizedResponse = {
  401: { description: "ログインしていない", content: errorContent },
};
// requireStaff・requireAdmin などで、ロールが合わなかったとき
const forbiddenResponse = {
  403: { description: "権限がない", content: errorContent },
};
const notFoundResponse = {
  404: { description: "見つからない", content: errorContent },
};
// apiHandler で包んだ API は、想定外のエラーのとき 500 INTERNAL_ERROR を返す
const serverErrorResponse = {
  500: { description: "サーバーのエラー", content: errorContent },
};

// 複数の API で返すデータの形（まだパスで使っていないものも、FE が型を見られるように登録しておく）
registry.register("FoundItem", FoundItem);
registry.register("LostReport", LostReport);
registry.register("LostReportForAdmin", LostReportForAdmin);
registry.register("LostReportList", LostReportList);
registry.register("LostReportForAdminList", LostReportForAdminList);

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

registry.registerPath({
  method: "get",
  path: "/api/found-items",
  summary: "拾得物の一覧・検索（member / admin）",
  description:
    "foundAt の新しい順。削除したものは出さない。一覧では photos は 1 枚目だけ",
  request: { query: FoundItemListQuery },
  responses: {
    200: {
      description: "拾得物の一覧と、条件に合う全件の数",
      content: { "application/json": { schema: FoundItemList } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/lost-reports/{id}/candidates",
  summary: "照合の候補一覧（admin）",
  description:
    "申請と同じカテゴリで status が received の拾得物を、lostAt に近い順で返す",
  request: { params: LostReportIdParams },
  responses: {
    200: {
      description: "照合候補の拾得物一覧",
      content: { "application/json": { schema: LostReportCandidates } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...serverErrorResponse,
  },
});
