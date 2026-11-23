import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, matches } from "@/db/schema";
import { requireGuest } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  findGuestLostReportId,
  findLostReport,
} from "@/lib/queries/lost-reports";
import {
  LostReportCancelBody,
  LostReportIdParams,
  type LostReport,
} from "@/lib/schemas/lost-report";
import { toLostReport } from "@/lib/serializers/lost-report";

// 申請を取り消す（guest は自分の申請だけ）。画面：G08
// 探し中・見つかったかも・受け渡し待ちのときだけ。紐づけがあれば解除して、拾得物を「受理」に戻す
export const POST = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/cancel">) => {
    const guest = await requireGuest(request);
    const { id } = parseParams(await ctx.params, LostReportIdParams);
    const { reason, note } = await parseBody(request, LostReportCancelBody);

    // 申請 → 紐づけ → 拾得物の順に更新する（DELETE /matches/{foundItemId} と同じ）
    const row = await getDb().transaction(async (tx) => {
      // 本人確認も消す（受け取り方法は、選んだ記録として残す）
      const [report] = await tx
        .update(lostReports)
        .set({
          status: "cancelled",
          verifiedAt: null,
          cancelReason: reason,
          cancelNote: note ?? null,
          cancelledAt: sql`now()`,
        })
        .where(
          and(
            eq(lostReports.id, id),
            eq(lostReports.guestId, guest.id),
            inArray(lostReports.status, [
              "searching",
              "maybe_found",
              "awaiting_handover",
            ]),
          ),
        )
        .returning({ id: lostReports.id });
      if (!report) {
        throw await notFoundOrConflict(
          findGuestLostReportId(tx, id, guest.id),
          "この申請は、もう終わっているので取り消せません",
          "申請が見つかりません",
        );
      }

      const [match] = await tx
        .update(matches)
        .set({ releasedAt: sql`now()` })
        .where(and(eq(matches.lostReportId, id), isNull(matches.releasedAt)))
        .returning({ foundItemId: matches.foundItemId });

      // 拾得物は「照合中」「受け渡し待ち」のときだけ「受理」に戻す。ほかの状態に変わっていても
      // （データの食い違いなど）取り消しは通す（DELETE /matches/{foundItemId} と同じ）
      if (match) {
        await tx
          .update(foundItems)
          .set({ status: "received" })
          .where(
            and(
              eq(foundItems.id, match.foundItemId),
              inArray(foundItems.status, ["matching", "awaiting_handover"]),
            ),
          );
      }

      return findLostReport(tx, id);
    });
    if (!row) throw notFound("申請が見つかりません");

    return Response.json(toLostReport(row) satisfies LostReport);
  },
);
