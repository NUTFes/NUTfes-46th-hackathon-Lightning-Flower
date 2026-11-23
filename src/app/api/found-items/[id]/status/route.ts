import { and, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { foundItems } from "@/db/schema";
import type { FOUND_STATUSES } from "@/db/enums";
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
} from "@/lib/schemas/found-item";
import { photoPathsOf, toFoundItem } from "@/lib/serializers/found-item";
import { signPhotoUrls } from "@/lib/storage/photos";

type FoundStatus = (typeof FOUND_STATUSES)[number];

// 手で変えられるのは、紐づけがないときの「受理」と「警察へ移管」「処分」の行き来だけ。
// 照合中・受け渡し待ち・解決済みには、紐づけ・受け取り方法・受け渡しの API でしか変わらない
const MANUAL_STATUSES = [
  "received",
  "transferred_to_police",
  "disposed",
] as const satisfies readonly FoundStatus[];

function isManualStatus(
  status: FoundStatus,
): status is (typeof MANUAL_STATUSES)[number] {
  return (MANUAL_STATUSES as readonly string[]).includes(status);
}

// ステータスを手で変える（admin）。画面：A03
export const PATCH = apiHandler(
  async (request, ctx: RouteContext<"/api/found-items/[id]/status">) => {
    const staff = await requireAdmin(request);
    const { id } = parseParams(await ctx.params, FoundItemIdParams);
    const { status } = await parseBody(request, FoundItemStatusBody);
    if (!isManualStatus(status)) {
      throw conflict(
        "手で変えられるのは「受理」「警察へ移管」「処分」だけです（解決済みにするときは受け渡しを記録してください）",
      );
    }

    const row = await getDb().transaction(async (tx) => {
      // 申請 → 拾得物の順にロックする（docs/api-guide.md の「状態を変える API」の 3）。
      // 紐づけがあるときは変えられない
      if (await lockActiveMatch(tx, id)) {
        throw conflict(
          "この拾得物は申請と紐づいているので、ステータスを変えられません",
        );
      }

      // 今と同じステータスには変えない（警察へ移管と処分の間は変えられる）
      const from = MANUAL_STATUSES.filter((s) => s !== status);
      const [item] = await tx
        .update(foundItems)
        .set(
          status === "received"
            ? { status, disposedAt: null, disposalNote: null }
            : { status, disposedAt: sql`now()` },
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
