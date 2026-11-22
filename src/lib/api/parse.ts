import type { z } from "zod";
import { badRequest } from "./errors";

// リクエストの JSON を zod で確かめる。合わなければ ZodError を投げる（apiHandler が 400 にする）
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
  return schema.parse(json);
}

// クエリ文字列（?page=1&status=a,b）を zod で確かめる。
// 値はすべて文字列なので、数値は z.coerce.number() などで受ける
export function parseQuery<T extends z.ZodType>(
  request: Request,
  schema: T,
): z.infer<T> {
  const params = new URL(request.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

// URL の [id] を zod で確かめる（例：parseParams(await ctx.params, z.object({ id: z.uuid() }))）
export function parseParams<T extends z.ZodType>(
  params: unknown,
  schema: T,
): z.infer<T> {
  return schema.parse(params);
}
