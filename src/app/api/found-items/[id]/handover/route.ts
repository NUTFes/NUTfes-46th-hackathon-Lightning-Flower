import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems, handovers, lostReports } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseOptionalBody, parseParams } from "@/lib/api/parse";
import { notFoundOrConflict } from "@/lib/api/transition";
import {
  activeFoundItemById,
  findFoundItem,
  findFoundItemId,
  lockActiveMatch,
} from "@/lib/queries/found-items";
import {
  type FoundItem,
  FoundItemIdParams,
  HandoverBody,
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

// 受け渡しを記録して解決済みにする（admin）。画面：A03
// ⑥ 通常の受け渡し（有効な紐づけがある）と、②'' 本部での直接返却（紐づけがない）の両方
export const POST = apiHandler(
  async (request, ctx: RouteContext<"/api/found-items/[id]/handover">) => {
    const staff = await requireAdmin(request);
    const { id } = parseParams(await ctx.params, FoundItemIdParams);
    // 入力はない（古い画面が送ってくる handedAt・receiverName は捨てる）
    await parseOptionalBody(request, HandoverBody);

    const row = await getDb().transaction(async (tx) => {
      // 申請 → 拾得物の順にロックする（有効な紐づけがあれば、申請の行を先にロックして確かめ直す）
      const lostReportId = await lockActiveMatch(tx, id);

      if (lostReportId) {
        // 本人確認や受け取り方法の前に窓口へ来たときも含めて、見つかったかも・受け渡し待ちのどちらでも解決済みにする
        const [report] = await tx
          .update(lostReports)
          .set({ status: "resolved" })
          .where(
            and(
              eq(lostReports.id, lostReportId),
              inArray(lostReports.status, ["maybe_found", "awaiting_handover"]),
            ),
          )
          .returning({ id: lostReports.id });
        if (!report) {
          throw conflict(
            "紐づいた申請が「見つかったかも」「受け渡し待ち」ではないので、受け渡しを記録できません",
          );
        }
      }

      // 紐づけがあれば照合中・受け渡し待ち、なければ（直接返却）受理のときだけ。
      // 紐づけがないときに照合中も許すと、同時に紐づけが入ったとき、申請を残して拾得物だけ解決済みになる
      const [item] = await tx
        .update(foundItems)
        .set({ status: "resolved" })
        .where(
          and(
            activeFoundItemById(id),
            lostReportId
              ? inArray(foundItems.status, ["matching", "awaiting_handover"])
              : eq(foundItems.status, "received"),
          ),
        )
        .returning({ id: foundItems.id });
      if (!item) {
        throw await notFoundOrConflict(
          findFoundItemId(tx, id),
          "この拾得物は「受理」「照合中」「受け渡し待ち」ではないので、受け渡しを記録できません",
          "拾得物が見つかりません",
        );
      }

      await tx.insert(handovers).values({
        foundItemId: id,
        lostReportId,
        // 受け渡しの時刻は、ボタンを押した時刻（ほかの状態を変える API と同じく DB の now()）。受け取った人の名前は入れない
        handedAt: sql`now()`,
        receiverName: null,
        recordedByEmail: staff.email,
      });

      return findFoundItem(tx, id);
    });
    if (!row) throw notFound("拾得物が見つかりません");

    const photoUrlOf = await signPhotoUrls(photoPathsOf([row], "all"));
    return Response.json(
      toFoundItem(row, staff, photoUrlOf) satisfies FoundItem,
    );
  },
);
