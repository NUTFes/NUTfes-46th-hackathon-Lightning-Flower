import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { CategoryList } from "@/lib/schemas/category";
import { ErrorResponse } from "@/lib/schemas/error";
import {
  FoundItem,
  FoundItemIdParams,
  FoundItemList,
  FoundItemListQuery,
  PatchFoundItemBody,
} from "@/lib/schemas/found-item";
import { HealthError, HealthOk } from "@/lib/schemas/health";
import {
  LostReport,
  LostReportForAdmin,
  LostReportForAdminList,
  LostReportList,
  LostReportIdParams,
} from "@/lib/schemas/lost-report";
import { MatchCreateBody, MatchParams } from "@/lib/schemas/match";
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
  404: { description: "見つからない（削除済みを含む）", content: errorContent },
};
const conflictResponse = {
  409: {
    description: "現在のステータスでは操作できない",
    content: errorContent,
  },
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
  path: "/api/found-items/{id}",
  summary: "拾得物の詳細（member / admin）",
  request: {
    params: FoundItemIdParams,
  },
  responses: {
    200: {
      description: "拾得物の詳細",
      content: { "application/json": { schema: FoundItem } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/found-items/{id}",
  summary: "拾得物の編集（member は自分の登録だけ / admin）",
  description: "photos を送ったら丸ごと置き換える。ステータス変更はしない",
  request: {
    params: FoundItemIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: PatchFoundItemBody } },
    },
  },
  responses: {
    200: {
      description: "更新後の拾得物",
      content: { "application/json": { schema: FoundItem } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/found-items/{id}",
  summary: "拾得物の論理削除（member は自分の登録だけ / admin）",
  description: "status が received のときだけ削除できる",
  request: {
    params: FoundItemIdParams,
  },
  responses: {
    204: {
      description: "削除完了（ボディなし）",
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

// 紐づけ・解除・本人確認は、どれも更新したあとの申請を返す
const updatedLostReportResponse = {
  200: {
    description: "更新したあとの申請",
    content: { "application/json": { schema: LostReportForAdmin } },
  },
};

registry.registerPath({
  method: "post",
  path: "/api/lost-reports/{id}/matches",
  summary: "申請を拾得物と紐づける（admin）",
  description:
    "申請が searching、拾得物が received のときだけ（それ以外は 409）。申請を maybe_found、拾得物を matching にする",
  request: {
    params: LostReportIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: MatchCreateBody } },
    },
  },
  responses: {
    ...updatedLostReportResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/lost-reports/{id}/matches/{foundItemId}",
  summary: "紐づけを解除する（admin。本人確認で違ったとき）",
  description:
    "申請が maybe_found で、この拾得物と有効な紐づけがあるときだけ（それ以外は 409）。紐づけに releasedAt を入れ、申請を searching（本人確認も消す）、拾得物を received に戻す",
  request: { params: MatchParams },
  responses: {
    ...updatedLostReportResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/lost-reports/{id}/verify",
  summary: "本人確認 OK にする（admin）",
  description:
    "申請が maybe_found で、有効な紐づけがあり、まだ本人確認をしていないときだけ（それ以外は 409）。verified を true にする。ステータスは変えない",
  request: { params: LostReportIdParams },
  responses: {
    ...updatedLostReportResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});
