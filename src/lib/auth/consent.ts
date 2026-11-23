import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { guests } from "@/db/schema";
import { unauthorized } from "@/lib/api/errors";
import type { Guest } from "./guest";

// 個人情報の取り扱いに同意したことを guests に記録する（POST /api/me/consent とログインのコールバックで使う）。
// 行がなければ作り、あれば agreed_at を入れる。2 回呼んでも壊れない：
//   - agreed_at は最初に同意した日時を残す（同意の記録を後から書き換えないため）
//   - email・display_name はログインし直したときの値に合わせる（Google の名前がなければ前の値を残す）
// guest は検証したセッションのものだけを渡す（本文の ID などは受け取らない）
export async function recordConsent(db: Db, guest: Guest): Promise<void> {
  await db
    .insert(guests)
    .values({
      id: guest.id,
      email: guest.email,
      displayName: guest.name ?? null,
      agreedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: guests.id,
      set: {
        email: sql`excluded.email`,
        displayName: sql`coalesce(excluded.display_name, ${guests.displayName})`,
        agreedAt: sql`coalesce(${guests.agreedAt}, excluded.agreed_at)`,
      },
    })
    .catch((error: unknown) => {
      // セッションはまだ有効でも、Supabase Auth のユーザーが消されていると guests.id の外部キーに当たる
      if (isForeignKeyViolation(error))
        throw unauthorized("ログインし直してください");
      throw error;
    });
}

// Postgres の foreign_key_violation（23503）。Drizzle は postgres のエラーを cause に入れて投げ直す
function isForeignKeyViolation(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    if ((e as { code?: unknown }).code === "23503") return true;
  }
  return false;
}
