import { conflict, notFound, type ApiError } from "./errors";

// 状態を変える API の部品（docs/api-guide.md の「状態を変える API」）。
//
// 1 つのトランザクションの中で、UPDATE の WHERE に今の状態を入れて、RETURNING で更新した行を受ける。
// 0 行なら、行がない（404）のか、状態が期待と違う（409）のかを確かめて投げる
// （投げるとトランザクションは取り消され、それまでの UPDATE も戻る）。
//
//   const [report] = await tx
//     .update(lostReports)
//     .set({ status: "maybe_found" })
//     .where(and(eq(lostReports.id, id), eq(lostReports.status, "searching")))
//     .returning({ id: lostReports.id });
//   if (!report) {
//     throw await notFoundOrConflict(
//       findLostReportId(tx, id), // 行があるか（src/lib/queries/ の find〇〇Id）
//       "この申請は「探し中」ではありません",
//     );
//   }
//
// 見本は POST /api/lost-reports/[id]/matches。
// existing には、その行が（論理削除を除いて）あるかを取るクエリを渡す。
// 行があれば conflict(message)、なければ notFound(notFoundMessage) を返す
export async function notFoundOrConflict(
  existing: Promise<unknown>,
  message: string,
  notFoundMessage?: string,
): Promise<ApiError> {
  return (await existing) ? conflict(message) : notFound(notFoundMessage);
}

// INSERT が UNIQUE 制約に当たったら 409 にする（状態の列と行が食い違っていたときなど）。
// 例：有効な紐づけは 1 申請・1 拾得物に 1 件まで（matches の部分 UNIQUE インデックス）
//
//   await tx.insert(matches).values({ ... }).catch(conflictOnUniqueViolation("…すでに…があります"));
export function conflictOnUniqueViolation(message: string) {
  return (error: unknown): never => {
    if (isUniqueViolation(error)) throw conflict(message);
    throw error;
  };
}

// Postgres の unique_violation（23505）。Drizzle は postgres のエラーを cause に入れて投げ直す
function isUniqueViolation(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
