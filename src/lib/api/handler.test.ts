import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { conflict, forbidden, notFound, unauthorized } from "./errors";
import { apiHandler } from "./handler";
import { parseBody, parseQuery } from "./parse";

const call = (
  handler: ReturnType<typeof apiHandler<undefined>>,
  request?: Request,
) => handler(request ?? new Request("http://localhost/api/test"), undefined);

describe("apiHandler", () => {
  it("ハンドラーの返り値をそのまま返す", async () => {
    const res = await call(apiHandler(async () => Response.json({ ok: true })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("レスポンスをキャッシュさせない（エラーのときも）", async () => {
    const ok = await call(apiHandler(async () => Response.json({ ok: true })));
    expect(ok.headers.get("Cache-Control")).toBe("private, no-store");
    const error = await call(
      apiHandler(async () => {
        throw notFound();
      }),
    );
    expect(error.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("ハンドラーが Cache-Control を付けたら、そちらを使う", async () => {
    const res = await call(
      apiHandler(async () =>
        Response.json(
          { ok: true },
          { headers: { "Cache-Control": "public, max-age=60" } },
        ),
      ),
    );
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it.each([
    [unauthorized(), 401, "UNAUTHORIZED"],
    [forbidden(), 403, "FORBIDDEN"],
    [notFound(), 404, "NOT_FOUND"],
    [conflict("今の状態ではできません"), 409, "CONFLICT"],
  ])("ApiError を共通のエラーの形にする（%#）", async (error, status, code) => {
    const res = await call(
      apiHandler(async () => {
        throw error;
      }),
    );
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({
      error: { code, message: error.message },
    });
  });

  it("入力チェックの失敗は 400 VALIDATION_ERROR にし、どの項目かを書く", async () => {
    const handler = apiHandler(async (request: Request) => {
      await parseBody(request, z.object({ features: z.string().min(1) }));
      return Response.json({});
    });
    const res = await call(
      handler,
      new Request("http://localhost/api/test", {
        method: "POST",
        body: JSON.stringify({ features: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("features");
  });

  it("本文が JSON でなければ 400 にする", async () => {
    const handler = apiHandler(async (request: Request) => {
      await parseBody(request, z.object({}));
      return Response.json({});
    });
    const res = await call(
      handler,
      new Request("http://localhost/api/test", { method: "POST", body: "{" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("サーバーの中での zod の検証の失敗は、入力の誤りではないので 500 にする", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(
      apiHandler(async () => {
        z.object({ isValuableDefault: z.boolean() }).parse({});
        return Response.json({});
      }),
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("isValuableDefault");
    log.mockRestore();
  });

  it("想定外のエラーは 500 にし、中身をレスポンスに出さない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(
      apiHandler(async () => {
        throw new Error("password=secret");
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("parseQuery", () => {
  it("クエリ文字列を zod で変換する", () => {
    const query = parseQuery(
      new Request("http://localhost/api/test?page=2&q=%E7%B4%BA"),
      z.object({ page: z.coerce.number().int(), q: z.string().optional() }),
    );
    expect(query).toEqual({ page: 2, q: "紺" });
  });

  it("同じキーを繰り返したら 400 にする", () => {
    expect(() =>
      parseQuery(
        new Request("http://localhost/api/test?status=a&status=b"),
        z.object({ status: z.string() }),
      ),
    ).toThrow(/status/);
  });

  it("値が空のキーは指定なしとして扱う（検索欄を空のまま送ったとき）", () => {
    const query = parseQuery(
      new Request("http://localhost/api/test?q=&status=&page=2"),
      z.object({
        q: z.string().min(1).optional(),
        status: z.string().min(1).optional(),
        page: z.coerce.number().int(),
      }),
    );
    expect(query).toEqual({ page: 2 });
  });
});
