import { z } from "zod";
import { badRequest } from "./errors";

// リクエストの入力を zod で確かめる。合わなければ 400 VALIDATION_ERROR の ApiError を投げる。
// 入力チェックの失敗だけを 400 にするため、リクエストの検証にはこのファイルの関数を使う
// （サーバーの中で直接 schema.parse() して失敗したときは、apiHandler が 500 にする）。

// リクエストの JSON
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw badRequest("リクエストの本文が JSON ではありません");
  }
  return validate(schema, json);
}

// 本文がなくてもよいリクエストの JSON。本文が空なら {} として確かめる
export async function parseOptionalBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const text = await request.text();
  if (text.trim() === "") return validate(schema, {});
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw badRequest("リクエストの本文が JSON ではありません");
  }
  return validate(schema, json);
}

// クエリ文字列（?page=1&status=a,b）。値はすべて文字列なので、数値は z.coerce.number() などで受ける。
// 複数の値はカンマ区切りで受ける。同じキーを繰り返したとき（?status=a&status=b）は、黙って片方を
// 捨てないように 400 にする。値が空のキー（検索欄を空のまま送った ?q=&status=）は、指定なしとして扱う
export function parseQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): z.infer<T> {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  const repeated = keys.find((key, i) => keys.indexOf(key) !== i);
  if (repeated) {
    throw badRequest(
      `${repeated}: 同じキーは 1 回だけにしてください（複数の値はカンマ区切り）`,
    );
  }
  return validate(
    schema,
    Object.fromEntries([...params].filter(([, value]) => value !== "")),
  );
}

// URL の [id]（例：parseParams(await ctx.params, z.object({ id: z.uuid() }))）
export function parseParams<T extends z.ZodType>(
  params: unknown,
  schema: T,
): z.infer<T> {
  return validate(schema, params);
}

function validate<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest(formatZodError(result.error));
  return result.data;
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join(".")}: ${issue.message}`
        : issue.message,
    )
    .join("\n");
}
