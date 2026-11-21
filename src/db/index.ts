import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL が設定されていません");
}

// Vercel からは Supabase のトランザクションプーラー経由でつなぐため、
// プリペアドステートメントを使わない。
const client = postgres(databaseUrl, { prepare: false });

export const db = drizzle(client, { schema });
