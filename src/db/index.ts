import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// db.transaction(async (tx) => ...) の tx
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

type Tables = ExtractTablesWithRelations<typeof schema>;

// db.query.<テーブル>.findMany({ with }) に渡す with の型。
// 共通の with を定数にするときは `satisfies WithOf<"foundItems">` と書く
// （as const にすると配列が readonly になり、Drizzle の型に合わなくなる）
export type WithOf<TTable extends keyof Tables> = NonNullable<
  DBQueryConfig<"many", true, Tables, Tables[TTable]>["with"]
>;

// その with で取った 1 行の型（with の形が serializer の行の型に合うかを、テストで確かめるのに使う）
export type RowOf<
  TTable extends keyof Tables,
  TWith extends WithOf<TTable>,
> = BuildQueryResult<Tables, Tables[TTable], { with: TWith }>;

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
