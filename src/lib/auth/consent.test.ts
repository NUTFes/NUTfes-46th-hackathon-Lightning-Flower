import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import { recordConsent } from "./consent";

// INSERT … ON CONFLICT の組み立てだけを確かめる（CI に DB がないので、実際の動きは curl と psql で確かめる）
function fakeDb(result: Promise<unknown> = Promise.resolve()) {
  const calls: {
    values?: Record<string, unknown>;
    conflict?: { set: Record<string, unknown> };
  } = {};
  const chain = {
    values: vi.fn((values) => {
      calls.values = values;
      return chain;
    }),
    onConflictDoUpdate: vi.fn((conflict) => {
      calls.conflict = conflict;
      return result;
    }),
  };
  const db = { insert: vi.fn(() => chain) } as unknown as Db;
  return { db, calls };
}

const dialect = new PgDialect();
const toSql = (value: unknown) => dialect.sqlToQuery(value as SQL).sql;

const guest = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "guest@example.com",
  name: "技大 太郎",
};

describe("recordConsent", () => {
  it("ログインのメールと Google の名前で行を作る", async () => {
    const { db, calls } = fakeDb();
    await recordConsent(db, guest);
    expect(calls.values).toMatchObject({
      id: guest.id,
      email: guest.email,
      displayName: "技大 太郎",
    });
    expect(toSql(calls.values?.agreedAt)).toBe("now()");
  });

  it("Google の名前がなければ display_name は null", async () => {
    const { db, calls } = fakeDb();
    await recordConsent(db, { id: guest.id, email: guest.email });
    expect(calls.values?.displayName).toBeNull();
  });

  it("2 回目は、最初に同意した日時を残し、名前がなければ前の名前を残す", async () => {
    const { db, calls } = fakeDb();
    await recordConsent(db, guest);
    const set = calls.conflict!.set;
    expect(toSql(set.agreedAt)).toBe(
      'coalesce("guests"."agreed_at", excluded.agreed_at)',
    );
    expect(toSql(set.displayName)).toBe(
      'coalesce(excluded.display_name, "guests"."display_name")',
    );
    expect(toSql(set.email)).toBe("excluded.email");
  });

  it("Auth のユーザーが消えていて外部キーに当たったら 401 にする", async () => {
    const pgError = Object.assign(new Error("fk"), { code: "23503" });
    const { db } = fakeDb(
      Promise.reject(new Error("Failed query", { cause: pgError })),
    );
    const error = await recordConsent(db, guest).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNAUTHORIZED");
  });

  it("ほかの DB のエラーはそのまま投げる（500 になる）", async () => {
    const original = new Error("connection refused");
    const { db } = fakeDb(Promise.reject(original));
    await expect(recordConsent(db, guest)).rejects.toBe(original);
  });
});
