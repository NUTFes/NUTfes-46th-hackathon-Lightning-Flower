import { and, eq, exists, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { lostReports, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  findLostReportForAdmin,
  findLostReportId,
} from "@/lib/queries/lost-reports";
import type { LostReportForAdmin } from "@/lib/schemas/lost-report";
import { LostReportParams } from "@/lib/schemas/match";
import { toLostReportForAdmin } from "@/lib/serializers/lost-report";

// 本人確認 OK にする（admin）。画面：A05・A06
// 有効な紐づけがあるときだけ verified_at を入れる。ステータスは変えない
export const POST = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/verify">) => {
    await requireAdmin(request);
    const { id } = parseParams(await ctx.params, LostReportParams);

    const row = await getDb().transaction(async (tx) => {
      // 「見つかったかも」で、まだ本人確認をしていなくて、有効な紐づけがあるときだけ
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
                .where(
                  and(
                    eq(matches.lostReportId, lostReports.id),
                    isNull(matches.releasedAt),
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
