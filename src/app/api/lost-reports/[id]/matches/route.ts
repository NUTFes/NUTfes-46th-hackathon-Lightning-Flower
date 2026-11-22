import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import { findFoundItemId } from "@/lib/queries/found-items";
import {
  findLostReportForAdmin,
  findLostReportId,
} from "@/lib/queries/lost-reports";
import type { LostReportForAdmin } from "@/lib/schemas/lost-report";
import { LostReportParams, MatchCreateBody } from "@/lib/schemas/match";
import { toLostReportForAdmin } from "@/lib/serializers/lost-report";

// 申請を拾得物と紐づける（admin）。画面：A05・A06
// 状態を変える API の見本（docs/api-guide.md の「状態を変える API」）
export const POST = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/matches">) => {
    // 1. 権限を確かめる
    const staff = await requireAdmin(request);

    // 2. 入力を確かめる
    const { id } = parseParams(await ctx.params, LostReportParams);
    const { foundItemId } = await parseBody(request, MatchCreateBody);

    // 3. 1 つのトランザクションで、今の状態が期待どおりのときだけ更新する
    //    （申請 → 拾得物の順に更新する。行のロックの順をどの API でも同じにして、デッドロックを避ける）
    const row = await getDb().transaction(async (tx) => {
      const [report] = await tx
        .update(lostReports)
        .set({ status: "maybe_found" })
        .where(and(eq(lostReports.id, id), eq(lostReports.status, "searching")))
        .returning({ id: lostReports.id });
      if (!report) {
        throw await notFoundOrConflict(
          findLostReportId(tx, id),
          "この申請は「探し中」ではないので、紐づけられません",
          "申請が見つかりません",
        );
      }

      const [item] = await tx
        .update(foundItems)
        .set({ status: "matching" })
        .where(
          and(
            eq(foundItems.id, foundItemId),
            eq(foundItems.status, "received"),
            isNull(foundItems.deletedAt),
          ),
        )
        .returning({ id: foundItems.id });
      if (!item) {
        throw await notFoundOrConflict(
          findFoundItemId(tx, foundItemId),
          "この拾得物は「受理」ではないので、紐づけられません",
          "拾得物が見つかりません",
        );
      }

      await tx
        .insert(matches)
        .values({ lostReportId: id, foundItemId, matchedByEmail: staff.email });

      return findLostReportForAdmin(tx, id);
    });
    if (!row) throw notFound("申請が見つかりません");

    // 4. 更新したあとの申請を、admin に返す形で返す
    return Response.json(
      toLostReportForAdmin(row) satisfies LostReportForAdmin,
    );
  },
);
