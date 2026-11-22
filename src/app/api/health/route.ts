import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { HealthError, HealthOk } from "@/lib/schemas/health";

// アプリと DB がつながっているかを返す。デプロイ後の確認に使う。
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" } satisfies HealthOk);
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", db: "unreachable" } satisfies HealthError,
      { status: 503 },
    );
  }
}
