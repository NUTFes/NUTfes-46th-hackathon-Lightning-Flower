import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// アプリと DB がつながっているかを返す。デプロイ後の確認に使う。
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error(error);
    return Response.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
