// guest のログイン（/auth/login → Google → /auth/callback）で使う定数

// ログインできる OAuth のプロバイダー（Supabase Auth で有効にしているもの）
export const GUEST_PROVIDERS = ["google"] as const;
export type GuestProvider = (typeof GUEST_PROVIDERS)[number];

export function isGuestProvider(value: string | null): value is GuestProvider {
  return (GUEST_PROVIDERS as readonly (string | null)[]).includes(value);
}

// ログインの画面で「同意する」にチェックしてからログインしたことを、コールバックまで運ぶ Cookie。
// ログインを始めるとき（/auth/login）に書き、コールバックで読んで消す
export const CONSENT_COOKIE = "otoshiru-login-consent";
export const CONSENT_COOKIE_MAX_AGE = 60 * 10; // Google の画面で迷っても足りる長さ

// ログインに失敗したときに戻すトップの URL（画面に失敗を出せるように ?error=login を付ける）
export function loginErrorUrl(origin: string): URL {
  return new URL("/?error=login", origin);
}

// ブラウザが開いているオリジン。リダイレクトの先と、Google のあとに戻る URL に使う。
// request.url は next dev だと localhost と待ち受けのポートになり、Docker で APP_PORT を変えたときや
// 127.0.0.1 で開いたときに、ブラウザのオリジンと食い違う（PKCE の Cookie が届かずログインに失敗する）。
// そのため Host（Vercel では X-Forwarded-Host）から作る。形がおかしければ request.url のオリジンを使う。
// Host を偽っても、偽った本人が別のホストへ移るだけで、戻る URL は Supabase Auth の許可リストでも確かめる
export function requestOrigin(request: Request): string {
  const fallback = new URL(request.url);
  const host = firstValue(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  const proto =
    firstValue(request.headers.get("x-forwarded-proto")) ??
    fallback.protocol.slice(0, -1);
  if (
    !host ||
    !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ||
    !["http", "https"].includes(proto)
  ) {
    return fallback.origin;
  }
  return `${proto}://${host}`;
}

// 「a, b」のように並んだヘッダーの、最初の値
function firstValue(value: string | null): string | undefined {
  return value?.split(",")[0].trim() || undefined;
}
