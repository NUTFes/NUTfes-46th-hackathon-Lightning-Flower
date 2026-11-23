import type { ErrorResponse } from "@/lib/schemas/error";

// 画面から API を呼ぶときのエラー。status と、API が返した { error: { code, message } } を持つ
export class FetchApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// 401・403・409 は、API の文言ではなく、画面で次にすることがわかる文言にする
const STATUS_MESSAGES: Record<number, string> = {
  401: "ログインが切れました。ページを読み込み直して、もう一度ログインしてください。",
  403: "この画面を見る権限がありません。",
  409: "今の状態ではこの操作はできません。ページを読み込み直してください。",
};

// GET /api/... を呼んで JSON を返す。Cookie や Cloudflare Access のヘッダーはブラウザが付ける
export async function fetchApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, init);
  if (response.ok) return (await response.json()) as T;

  const body = (await response
    .json()
    .catch(() => null)) as ErrorResponse | null;
  throw new FetchApiError(
    response.status,
    STATUS_MESSAGES[response.status] ??
      body?.error.message ??
      "読み込めませんでした。時間をおいてもう一度お試しください。",
  );
}

export function errorMessageOf(error: unknown) {
  return error instanceof FetchApiError
    ? error.message
    : "通信できませんでした。電波の届くところでもう一度お試しください。";
}
