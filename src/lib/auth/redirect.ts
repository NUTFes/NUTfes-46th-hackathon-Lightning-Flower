// ログインのあとに戻る先（?next=）を、このサイトの中のパスだけにする（オープンリダイレクトを防ぐ）。
// 「/」で始まり、URL として読んだときに同じオリジンのままのものだけを通す。
// 「//evil.example」「/\evil.example」や、タブ・改行を混ぜたもの（URL の解釈で消える）は、別のホストになるので通さない
export const DEFAULT_NEXT_PATH = "/home";

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DEFAULT_NEXT_PATH;
  const base = "http://localhost";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return DEFAULT_NEXT_PATH;
  }
  if (url.origin !== base) return DEFAULT_NEXT_PATH;
  return `${url.pathname}${url.search}${url.hash}`;
}
