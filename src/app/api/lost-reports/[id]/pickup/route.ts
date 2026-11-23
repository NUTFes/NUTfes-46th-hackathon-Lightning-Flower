import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, matches } from "@/db/schema";
import { requireGuest } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  findGuestLostReportId,
  findLostReport,
} from "@/lib/queries/lost-reports";
import {
  LostReportIdParams,
  LostReportPickupBody,
  type LostReport,
} from "@/lib/schemas/lost-report";
import { toLostReport } from "@/lib/serializers/lost-report";

// 受け取り方法を選ぶ（guest は自分の申請だけ）。画面：G07
// admin が本人確認 OK にした「見つかったかも」の申請だけ。申請と、紐づいた拾得物を「受け渡し待ち」にする
export const PUT = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/pickup">) => {
    const guest = await requireGuest(request);
    const { id } = parseParams(await ctx.params, LostReportIdParams);
    const { method, note } = await parseBody(request, LostReportPickupBody);

    // 申請 → 拾得物の順に更新する（docs/api-guide.md の「状態を変える API」）
    const row = await getDb().transaction(async (tx) => {
      // ほかの人の申請は、guestId の条件で 0 行になり、findGuestLostReportId で 404 になる
      const [report] = await tx
        .update(lostReports)
        .set({
          status: "awaiting_handover",
          pickupMethod: method,
          pickupNote: note ?? null,
        })
        .where(
          and(
            eq(lostReports.id, id),
            eq(lostReports.guestId, guest.id),
            eq(lostReports.status, "maybe_found"),
            isNotNull(lostReports.verifiedAt),
          ),
        )
        .returning({ id: lostReports.id });
      if (!report) {
        throw await notFoundOrConflict(
          findGuestLostReportId(tx, id, guest.id),
          "受け取り方法は、本部の確認が済んだ「見つかったかも」の申請でだけ選べます（もう選んだ申請・終わった申請では選べません）",
          "申請が見つかりません",
        );
      }

      // 申請の行をロックしたあとなので、紐づけは変わらない（紐づけを変える処理は申請の行を先に更新する）
      const [match] = await tx
        .select({ foundItemId: matches.foundItemId })
        .from(matches)
        .where(and(eq(matches.lostReportId, id), isNull(matches.releasedAt)));
      if (!match) {
        throw conflict("この申請には、紐づいた拾得物がありません");
      }

      const [item] = await tx
        .update(foundItems)
        .set({ status: "awaiting_handover" })
        .where(
          and(
            eq(foundItems.id, match.foundItemId),
            eq(foundItems.status, "matching"),
            isNull(foundItems.deletedAt),
          ),
        )
        .returning({ id: foundItems.id });
      if (!item) {
        throw conflict(
          "紐づいた拾得物が「照合中」ではないので、受け取り方法を選べません",
        );
      }

      return findLostReport(tx, id);
    });
    if (!row) throw notFound("申請が見つかりません");

    return Response.json(toLostReport(row) satisfies LostReport);
  },
);
