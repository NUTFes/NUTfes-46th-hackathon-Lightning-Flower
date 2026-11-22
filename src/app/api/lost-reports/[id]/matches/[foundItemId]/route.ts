import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import { findFoundItemId } from "@/lib/queries/found-items";
import {
  findLostReportForAdmin,
  findLostReportId,
} from "@/lib/queries/lost-reports";
import type { LostReportForAdmin } from "@/lib/schemas/lost-report";
import { MatchParams } from "@/lib/schemas/match";
import { toLostReportForAdmin } from "@/lib/serializers/lost-report";

// 紐づけを解除する（admin。本人確認で違ったとき）。画面：A05・A06
// 紐づけの行は消さずに released_at を入れ、申請を「探し中」、拾得物を「受理」に戻す。本人確認も消す
export const DELETE = apiHandler(
  async (
    request,
    ctx: RouteContext<"/api/lost-reports/[id]/matches/[foundItemId]">,
  ) => {
    await requireAdmin(request);
    const { id, foundItemId } = parseParams(await ctx.params, MatchParams);

    // 申請 → 紐づけ → 拾得物の順に更新する（POST /matches と同じく、申請の行を先にロックする）
    const row = await getDb().transaction(async (tx) => {
      // 受け取り方法を選んだあと（受け渡し待ち）は解除できない
      const [report] = await tx
        .update(lostReports)
        .set({ status: "searching", verifiedAt: null })
        .where(
          and(eq(lostReports.id, id), eq(lostReports.status, "maybe_found")),
        )
        .returning({ id: lostReports.id });
      if (!report) {
        throw await notFoundOrConflict(
          findLostReportId(tx, id),
          "この申請は「見つかったかも」ではないので、解除できません",
          "申請が見つかりません",
        );
      }

      const [match] = await tx
        .update(matches)
        .set({ releasedAt: sql`now()` })
        .where(
          and(
            eq(matches.lostReportId, id),
            eq(matches.foundItemId, foundItemId),
            isNull(matches.releasedAt),
          ),
        )
        .returning({ id: matches.id });
      if (!match) {
        throw await notFoundOrConflict(
          findFoundItemId(tx, foundItemId),
          "この申請はこの拾得物と紐づいていません",
          "拾得物が見つかりません",
        );
      }

      // 拾得物は「照合中」のときだけ「受理」に戻す。ほかの状態に変わっていても（データの食い違いなど）
      // 解除は通す（通さないと、申請が「見つかったかも」のまま戻せなくなる）
      await tx
        .update(foundItems)
        .set({ status: "received" })
        .where(
          and(
            eq(foundItems.id, foundItemId),
            eq(foundItems.status, "matching"),
          ),
        );

      return findLostReportForAdmin(tx, id);
    });
    if (!row) throw notFound("申請が見つかりません");

    return Response.json(
      toLostReportForAdmin(row) satisfies LostReportForAdmin,
    );
  },
);
