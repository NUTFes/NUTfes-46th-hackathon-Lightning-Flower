import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/parse";
import {
  BulkStatusBody,
  type BulkStatusResult,
} from "@/lib/schemas/found-item";

// 期間終了の一括変更（admin）。画面：A07
// 仮の決め方：対象は「受理（received）で有効な紐づけがない拾得物」だけ。1 件でも対象外があれば何も変えない
// （ない・削除済みは 404、状態が違うか紐づけがあれば 409）。申請側は変えない
export const POST = apiHandler(async (request) => {
  await requireAdmin(request);
  const { foundItemIds, status, note } = await parseBody(
    request,
    BulkStatusBody,
  );

  const updated = await getDb().transaction(async (tx) => {
    // 拾得物の行を ID の順にロックする（一括変更どうしが逆の順でロックし合って、デッドロックにならないように）。
    // 申請の行はロックしない：紐づけのある拾得物は対象外で、申請は変えないので、申請 → 拾得物の順に反しない。
    // 紐づけは拾得物を received → matching に UPDATE するので、ここでロックしたあとは紐づけが入らない
    const rows = await tx
      .select({ id: foundItems.id, status: foundItems.status })
      .from(foundItems)
      .where(
        and(inArray(foundItems.id, foundItemIds), isNull(foundItems.deletedAt)),
      )
      .orderBy(asc(foundItems.id))
      .for("update");
    if (rows.length !== foundItemIds.length) {
      throw notFound("見つからない拾得物があります");
    }
    if (rows.some((row) => row.status !== "received")) {
      throw conflict("「受理」ではない拾得物があるので、一括変更できません");
    }

    // 状態の列と食い違って、受理なのに有効な紐づけが残っているもの
    const [match] = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          inArray(matches.foundItemId, foundItemIds),
          isNull(matches.releasedAt),
        ),
      )
      .limit(1);
    if (match) {
      throw conflict("申請と紐づいている拾得物があるので、一括変更できません");
    }

    const result = await tx
      .update(foundItems)
      .set({ status, disposedAt: sql`now()`, disposalNote: note ?? null })
      .where(
        and(
          inArray(foundItems.id, foundItemIds),
          eq(foundItems.status, "received"),
        ),
      )
      .returning({ id: foundItems.id });
    return result.length;
  });

  return Response.json({ updated } satisfies BulkStatusResult);
});
