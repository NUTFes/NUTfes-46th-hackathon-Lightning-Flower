import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// 開発中はファイルを保存するたびにモジュールが読み直されるので、
// 接続プールを globalThis に置いて使い回す（読み直すたびに増やさない）。
const globalForDb = globalThis as unknown as { otoshiruDb?: Db };

// 最初に使うときに接続を作る。import しただけでは DATABASE_URL を見ないので、
// DB を使わないページのビルドは DATABASE_URL がなくても通る。
export function getDb(): Db {
  if (globalForDb.otoshiruDb) return globalForDb.otoshiruDb;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL が設定されていません");
  }

  // Vercel からは Supabase のトランザクションプーラー経由でつなぐため、
  // プリペアドステートメントを使わない。
  const db = drizzle(postgres(databaseUrl, { prepare: false }), { schema });
  globalForDb.otoshiruDb = db;
  return db;
}
