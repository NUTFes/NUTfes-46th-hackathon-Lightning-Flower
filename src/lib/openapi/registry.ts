import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { CategoryList } from "@/lib/schemas/category";
import { ErrorResponse } from "@/lib/schemas/error";
import {
  BulkStatusBody,
  BulkStatusResult,
  FoundItem,
  FoundItemCreateBody,
  FoundItemIdParams,
  FoundItemList,
  FoundItemListQuery,
  FoundItemStatusBody,
  HandoverBody,
  PatchFoundItemBody,
} from "@/lib/schemas/found-item";
import { HealthError, HealthOk } from "@/lib/schemas/health";
import {
  LostReport,
  LostReportForAdmin,
  LostReportForAdminList,
  LostReportCancelBody,
  LostReportList,
  LostReportIdParams,
  LostReportPatchBody,
  LostReportPickupBody,
} from "@/lib/schemas/lost-report";
import { MatchCreateBody, MatchParams } from "@/lib/schemas/match";
import { Me } from "@/lib/schemas/me";
import {
  ChatThreadList,
  ChatThreadListQuery,
  Message,
  MessageBroadcast,
  MessageBroadcastResult,
  MessageCreate,
  MessageList,
  MessageListQuery,
} from "@/lib/schemas/message";

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
registry.register("FoundItemCreateBody", FoundItemCreateBody);
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
  method: "post",
  path: "/api/found-items",
  summary: "拾得物の登録（member / admin）",
  description:
    "拾得物を 1 件登録する。photos は原則必須だが、「証明書・カード・定期券類」のみ空配列可",
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: FoundItemCreateBody },
      },
    },
  },
  responses: {
    201: {
      description: "登録した拾得物",
      content: { "application/json": { schema: FoundItem } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    404: { description: "カテゴリが見つからない", content: errorContent },
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

const updatedFoundItemResponse = {
  200: {
    description: "更新したあとの拾得物",
    content: { "application/json": { schema: FoundItem } },
  },
};

registry.registerPath({
  method: "post",
  path: "/api/found-items/{id}/handover",
  summary: "受け渡しを記録して解決済みにする（admin）",
  description:
    "拾得物が received / matching / awaiting_handover のときだけ（それ以外は 409）。handovers に記録し、拾得物を resolved にする。有効な紐づけの申請があれば（maybe_found でも awaiting_handover でも。本人確認の前（verified でない maybe_found）でも通す。窓口で現物を見せて本人確認する運用のため）それも resolved にする。ロックを待つ間に紐づけが変わっていたら 409。紐づけがなければ直接返却（lostReportId なし）",
  request: {
    params: FoundItemIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: HandoverBody } },
    },
  },
  responses: {
    ...updatedFoundItemResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/found-items/{id}/status",
  summary: "ステータスを手で変える（admin）",
  description:
    "紐づけがないときの received と transferred_to_police・disposed の行き来だけ。ほかの値は 400、今と同じ値や紐づけがあるときは 409。移管・処分にしたら disposedAt を入れて disposalNote を消し、received に戻したら disposedAt・disposalNote を消す",
  request: {
    params: FoundItemIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: FoundItemStatusBody } },
    },
  },
  responses: {
    ...updatedFoundItemResponse,
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
  path: "/api/found-items/bulk-status",
  summary: "期間終了の一括変更（admin）",
  description:
    "仮の決め方：対象は received で有効な紐づけがない拾得物だけ。1 件でも対象外があれば何も変えない（ない・削除済みは 404、状態が違うか紐づけがあれば 409）。disposedAt と disposalNote（= note）を入れる。申請は変えない",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: BulkStatusBody } },
    },
  },
  responses: {
    200: {
      description: "変えた件数",
      content: { "application/json": { schema: BulkStatusResult } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/lost-reports/{id}",
  summary: "遺失物申請の詳細・申請状況（guest は自分の申請だけ / admin）",
  description:
    "他人の申請は 404。admin にだけ guest・activeMatch・awaitingReply を返す",
  request: { params: LostReportIdParams },
  responses: {
    200: {
      description: "遺失物申請の詳細（admin の場合は LostReportForAdmin）",
      content: {
        "application/json": {
          schema: LostReport.or(LostReportForAdmin),
        },
      },
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
  path: "/api/lost-reports/{id}",
  summary: "遺失物申請の入力情報の変更（guest は自分の申請だけ）",
  description: "searching（探し中）のときだけ変更できる。それ以外は 409",
  request: {
    params: LostReportIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: LostReportPatchBody } },
    },
  },
  responses: {
    200: {
      description: "更新後の遺失物申請",
      content: { "application/json": { schema: LostReport } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

// --- チャット（#15） ---------------------------------------------------------

// チャットの API の 404（guest がほかの人の申請を指したときも 404 にするので、説明を分ける）
const chatNotFoundResponse = {
  404: {
    description: "申請がない（guest がほかの人の申請を指したときも）",
    content: errorContent,
  },
};

registry.registerPath({
  method: "get",
  path: "/api/lost-reports/{id}/messages",
  summary: "チャットのメッセージの取得（guest は自分の申請だけ / admin）",
  description:
    "古い順。画面を開いている間、30 秒ごとに after 付きで呼ぶ。取りこぼさないように、前回の最新より少し前を after に渡し、画面側で id で重複を除く",
  request: { params: LostReportIdParams, query: MessageListQuery },
  responses: {
    200: {
      description: "メッセージの一覧",
      content: { "application/json": { schema: MessageList } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...chatNotFoundResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/lost-reports/{id}/messages",
  summary: "チャットのメッセージの送信（guest は自分の申請だけ / admin）",
  description:
    "本文は前後の空白を除いて 1〜1000 文字。guest は、admin から 1 通以上届いていて、終わっていない（resolved・transferred_to_police・disposed・cancelled でない）申請にだけ送れる。admin は終わった申請にも送れる",
  request: {
    params: LostReportIdParams,
    body: { content: { "application/json": { schema: MessageCreate } } },
  },
  responses: {
    201: {
      description: "入れたメッセージ",
      content: { "application/json": { schema: Message } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...chatNotFoundResponse,
    409: {
      description:
        "guest が送れない（admin からまだ届いていない・終わった申請）",
      content: errorContent,
    },
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/chats",
  summary: "チャットのスレッドの一覧（admin）",
  description:
    "メッセージが 1 通以上ある申請を、lastMessageAt の新しい順に返す（?page=1&limit=20 で区切り、total は条件に合う全件の数）。返信待ち＝最新のメッセージが guest のもの",
  request: { query: ChatThreadListQuery },
  responses: {
    200: {
      description: "スレッドの一覧と、条件に合う全件の数",
      content: { "application/json": { schema: ChatThreadList } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/messages/broadcast",
  summary: "チャットの一斉送信（admin）",
  description:
    "lostReportIds か status のどちらか一方で宛先を指定し、それぞれの申請に admin のメッセージを 1 通ずつ入れる。ない申請の ID は飛ばす",
  request: {
    body: { content: { "application/json": { schema: MessageBroadcast } } },
  },
  responses: {
    200: {
      description: "入れたメッセージの数",
      content: { "application/json": { schema: MessageBroadcastResult } },
    },
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
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

// 受け取り方法・取り消しは guest の API。更新したあとの申請を guest に返す形で返す
const updatedLostReportForGuestResponse = {
  200: {
    description: "更新したあとの申請",
    content: { "application/json": { schema: LostReport } },
  },
};
const guestLostReportNotFoundResponse = {
  404: {
    description: "申請がない（ほかの人の申請を指したときも）",
    content: errorContent,
  },
};

registry.registerPath({
  method: "put",
  path: "/api/lost-reports/{id}/pickup",
  summary: "受け取り方法を選ぶ（guest は自分の申請だけ）",
  description:
    "申請が maybe_found で、admin が本人確認 OK にしたあと（verified が true）だけ（それ以外は 409）。method が other のときは note が必須。申請と紐づいた拾得物を awaiting_handover にする",
  request: {
    params: LostReportIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: LostReportPickupBody } },
    },
  },
  responses: {
    ...updatedLostReportForGuestResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...guestLostReportNotFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/lost-reports/{id}/cancel",
  summary: "申請を取り消す（guest は自分の申請だけ）",
  description:
    "申請が searching・maybe_found・awaiting_handover のときだけ（それ以外は 409）。申請を cancelled にし、本人確認を消す。有効な紐づけがあれば releasedAt を入れて解除し、拾得物を received に戻す",
  request: {
    params: LostReportIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: LostReportCancelBody } },
    },
  },
  responses: {
    ...updatedLostReportForGuestResponse,
    ...badRequestResponse,
    ...unauthorizedResponse,
    ...forbiddenResponse,
    ...guestLostReportNotFoundResponse,
    ...conflictResponse,
    ...serverErrorResponse,
  },
});
