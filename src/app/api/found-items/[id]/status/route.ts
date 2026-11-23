import { and, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems } from "@/db/schema";
import { requireAdmin } from "@/lib/api/auth";
import { conflict, notFound } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { parseBody, parseParams } from "@/lib/api/parse";
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
  FoundItemStatusBody,
  MANUAL_FOUND_STATUSES,
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

// ステータスを手で変える（admin）。画面：A03
export const PATCH = apiHandler(
  async (request, ctx: RouteContext<"/api/found-items/[id]/status">) => {
    const staff = await requireAdmin(request);
    const { id } = parseParams(await ctx.params, FoundItemIdParams);
    const { status } = await parseBody(request, FoundItemStatusBody);

    const row = await getDb().transaction(async (tx) => {
      // 申請 → 拾得物の順にロックする（docs/api-guide.md の「状態を変える API」の 3）。
      // 紐づけがあるときは変えられない
      if (await lockActiveMatch(tx, id)) {
        throw conflict(
          "この拾得物は申請と紐づいているので、ステータスを変えられません",
        );
      }

      // 今と同じステータスには変えない（警察へ移管と処分の間は変えられる）
      const from = MANUAL_FOUND_STATUSES.filter((s) => s !== status);
      const [item] = await tx
        .update(foundItems)
        .set(
          status === "received"
            ? { status, disposedAt: null, disposalNote: null }
            : // 移管と処分を行き来したとき、前の預り書の番号などを残さない（PATCH では note を受けない）
              { status, disposedAt: sql`now()`, disposalNote: null },
        )
        .where(and(activeFoundItemById(id), inArray(foundItems.status, from)))
        .returning({ id: foundItems.id });
      if (!item) {
        throw await notFoundOrConflict(
          findFoundItemId(tx, id),
          "今のステータスからは、このステータスに変えられません",
          "拾得物が見つかりません",
        );
      }

      return findFoundItem(tx, id);
    });
    if (!row) throw notFound("拾得物が見つかりません");

    const photoUrlOf = await signPhotoUrls(photoPathsOf([row], "all"));
    return Response.json(
      toFoundItem(row, staff, photoUrlOf) satisfies FoundItem,
    );
  },
);
