import { and, eq, exists, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  findLostReportForAdmin,
  findLostReportId,
} from "@/lib/queries/lost-reports";
import {
  LostReportParams,
  type LostReportForAdmin,
} from "@/lib/schemas/lost-report";
import { toLostReportForAdmin } from "@/lib/serializers/lost-report";

// 本人確認 OK にする（admin）。画面：A05・A06
// 有効な紐づけがあるときだけ verified_at を入れる。ステータスは変えない
export const POST = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/verify">) => {
    await requireAdmin(request);
    const { id } = parseParams(await ctx.params, LostReportParams);

    const row = await getDb().transaction(async (tx) => {
      // 「見つかったかも」で、まだ本人確認をしていなくて、有効な紐づけ（拾得物が照合中で、削除していない）が
      // あるときだけ。EXISTS は同時の更新を待ったあとも見直されないが、紐づけを変える処理は申請の行を先に
      // UPDATE するので、申請の status の条件で 0 行になる（docs/api-guide.md の「状態を変える API」）
      const [report] = await tx
        .update(lostReports)
        .set({ verifiedAt: sql`now()` })
        .where(
          and(
            eq(lostReports.id, id),
            eq(lostReports.status, "maybe_found"),
            isNull(lostReports.verifiedAt),
            exists(
              tx
                .select({ id: matches.id })
                .from(matches)
                .innerJoin(foundItems, eq(foundItems.id, matches.foundItemId))
                .where(
                  and(
                    eq(matches.lostReportId, lostReports.id),
                    isNull(matches.releasedAt),
                    eq(foundItems.status, "matching"),
                    isNull(foundItems.deletedAt),
                  ),
                ),
            ),
          ),
        )
        .returning({ id: lostReports.id });
      if (!report) {
        throw await notFoundOrConflict(
          findLostReportId(tx, id),
          "この申請は、紐づいた拾得物がないか、もう本人確認をしています",
          "申請が見つかりません",
        );
      }

      return findLostReportForAdmin(tx, id);
    });
    if (!row) throw notFound("申請が見つかりません");

    return Response.json(
      toLostReportForAdmin(row) satisfies LostReportForAdmin,
    );
  },
);
