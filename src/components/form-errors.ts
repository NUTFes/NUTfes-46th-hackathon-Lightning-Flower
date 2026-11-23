import type { z } from "@/lib/schemas/zod";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// safeParse の失敗を、項目ごとの最初のエラー文にする（フォームの入力欄の下に出す）
export function fieldErrorsOf<K extends string>(
  error: z.ZodError,
): FieldErrors<K> {
  const result: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") result[key as K] ??= issue.message;
  }
  return result;
}
