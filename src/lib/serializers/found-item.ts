import type { RowOf } from "@/db";
import type { Staff } from "@/lib/auth/staff";
import { formatFoundNumber, formatLostNumber } from "@/lib/display-number";
import type { foundItemWith } from "@/lib/queries/found-items";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { PhotoUrlOf } from "@/lib/storage/photos";

// DB の行（src/lib/queries/found-items.ts の foundItemWith で取ったもの）を、API の FoundItem にする。
// matches は有効な紐づけだけ、handovers は新しい順（解決済みなら 1 件ある）。
// 一覧用の foundItemListWith で取った行も、写真が 1 枚になるだけで同じ型
export type FoundItemRow = RowOf<"foundItems", typeof foundItemWith>;

export function toFoundItem(
  row: FoundItemRow,
  viewer: Staff,
  photoUrlOf: PhotoUrlOf,
): FoundItem {
  const match = row.matches[0];
  const handover = row.handovers[0];

  return {
    id: row.id,
    displayNumber: formatFoundNumber(row.number),
    status: row.status,
    category: row.category,
    color: row.color,
    brand: row.brand,
    foundPlace: row.foundPlace,
    foundAt: row.foundAt.toISOString(),
    isValuable: row.isValuable,
    memo: row.memo,
    photos: row.photos.map((photo) => ({
      id: photo.id,
      url: photoUrlOf(photo.storagePath),
      thumbUrl: photoUrlOf(photo.thumbPath),
    })),
    registeredByEmail: row.registeredByEmail,
    canEdit: viewer.role === "admin" || row.registeredByEmail === viewer.email,
    activeMatch: match
      ? {
          lostReportId: match.lostReport.id,
          displayNumber: formatLostNumber(match.lostReport.number),
        }
      : null,
    handover: handover
      ? {
          handedAt: handover.handedAt.toISOString(),
          receiverName: handover.receiverName,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// 写真の署名付き URL をまとめて作るために、行に含まれる写真のパスを集める。
// 一覧では thumbUrl だけを使うので、"thumb" を渡すとサムネイルだけにする（元の画像の url は "" になる）
export function photoPathsOf(
  rows: Pick<FoundItemRow, "photos">[],
  kind: "all" | "thumb" = "all",
) {
  return rows.flatMap((row) =>
    row.photos.flatMap((photo) =>
      kind === "thumb"
        ? [photo.thumbPath]
        : [photo.storagePath, photo.thumbPath],
    ),
  );
}
