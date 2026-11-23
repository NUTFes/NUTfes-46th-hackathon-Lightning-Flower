import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { Db, Tx, WithOf } from "@/db";
import { containsPattern } from "@/db/like";
import { foundItemPhotos, foundItems, handovers, matches } from "@/db/schema";
import type { Staff } from "@/lib/auth/staff";
import type { FoundItemListQuery } from "@/lib/schemas/found-item";

// 拾得物を FoundItem にするために、一緒に取る関連の行（db.query.foundItems の with に渡す）。
// 取った行の型が src/lib/serializers/found-item.ts の FoundItemRow になる（with を変えると、型が一緒に変わる）
export const foundItemWith = {
  category: { columns: { id: true, name: true } },
  photos: {
    columns: { id: true, storagePath: true, thumbPath: true },
    orderBy: [asc(foundItemPhotos.sortOrder)],
  },
  // 有効な紐づけだけ
  matches: {
    columns: {},
    where: isNull(matches.releasedAt),
    with: { lostReport: { columns: { id: true, number: true } } },
  },
  handovers: {
    columns: { handedAt: true, receiverName: true },
    orderBy: [desc(handovers.handedAt)],
    limit: 1,
  },
} satisfies WithOf<"foundItems">;

// 一覧では写真を 1 枚目だけ取る
export const foundItemListWith = {
  ...foundItemWith,
  photos: { ...foundItemWith.photos, limit: 1 },
} satisfies WithOf<"foundItems">;

// GET /api/found-items の絞り込みの条件（論理削除したものは常に除く）
export function foundItemFilters(query: FoundItemListQuery, viewer: Staff) {
  return and(
    isNull(foundItems.deletedAt),
    query.q
      ? or(
          ilike(foundItems.brand, containsPattern(query.q)),
          ilike(foundItems.memo, containsPattern(query.q)),
          ilike(foundItems.foundPlace, containsPattern(query.q)),
        )
      : undefined,
    query.status ? inArray(foundItems.status, query.status) : undefined,
    query.categoryId != null
      ? eq(foundItems.categoryId, query.categoryId)
      : undefined,
    query.color ? inArray(foundItems.color, query.color) : undefined,
    query.place
      ? ilike(foundItems.foundPlace, containsPattern(query.place))
      : undefined,
    query.foundFrom
      ? gte(foundItems.foundAt, new Date(query.foundFrom))
      : undefined,
    query.foundTo
      ? lte(foundItems.foundAt, new Date(query.foundTo))
      : undefined,
    query.mine ? eq(foundItems.registeredByEmail, viewer.email) : undefined,
  );
}

// ID の拾得物（論理削除したものは、ないものとする）。1 件を取る API は、どれもこの条件で取る
// （GET・PATCH・DELETE /api/found-items/{id} と、状態を変える API の 404 の判定をそろえるため）
export function activeFoundItemById(id: string) {
  return and(eq(foundItems.id, id), isNull(foundItems.deletedAt));
}

// 拾得物があるか（論理削除したものは、ないものとする）。状態を変える API で、
// 更新できなかったときに 404 と 409 を分けるのに使う
export function findFoundItemId(db: Db | Tx, id: string) {
  return db.query.foundItems.findFirst({
    where: activeFoundItemById(id),
    columns: { id: true },
  });
}
