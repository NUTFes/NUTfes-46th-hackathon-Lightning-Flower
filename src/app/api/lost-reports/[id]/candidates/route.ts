import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, lostReports } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseParams } from "@/lib/api/parse";
import { foundItemListWith } from "@/lib/queries/found-items";
import {
  type LostReportCandidates,
  LostReportIdParams,
} from "@/lib/schemas/lost-report";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

// 照合の候補一覧（admin）。画面：A05
export const GET = apiHandler(
  async (request, ctx: RouteContext<"/api/lost-reports/[id]/candidates">) => {
    // 1. 権限を確かめる（admin のみ）
    const admin = await requireAdmin(request);

    // 2. 入力を確かめる（合わなければ 400）
    const { id } = parseParams(await ctx.params, LostReportIdParams);

    // 3. DB から取る
    const db = getDb();
    const report = await db.query.lostReports.findFirst({
      where: eq(lostReports.id, id),
      columns: { id: true, categoryId: true, lostAt: true },
    });
    if (!report) {
      throw notFound("遺失物申請が見つかりません");
    }

    const rows = await db.query.foundItems.findMany({
      where: and(
        isNull(foundItems.deletedAt),
        eq(foundItems.categoryId, report.categoryId),
        eq(foundItems.status, "received"),
      ),
      with: foundItemListWith,
      orderBy: [
        asc(
          sql`abs(extract(epoch from (${foundItems.foundAt} - ${report.lostAt.toISOString()}::timestamptz)))`,
        ),
        desc(foundItems.number),
      ],
    });

    // 4. 共通の形にして返す（写真の署名付き URL はまとめて作る。一覧ではサムネイルだけ）
    const photoUrlOf = await signPhotoUrls(photoPathsOf(rows, "thumb"));
    return Response.json({
      items: rows.map((row) => toFoundItem(row, admin, photoUrlOf)),
    } satisfies LostReportCandidates);
  },
);
