import type { foundItems } from "@/db/schema";
import type { Staff } from "@/lib/auth/staff";
import { formatFoundNumber, formatLostNumber } from "@/lib/display-number";
import type { FoundItem } from "@/lib/schemas/found-item";
import type { PhotoUrlOf } from "@/lib/storage/photos";

// DB の行（src/lib/queries/found-items.ts の foundItemWith で取ったもの）を、API の FoundItem にする
export type FoundItemRow = typeof foundItems.$inferSelect & {
  category: { id: number; name: string };
  photos: { id: string; storagePath: string; thumbPath: string }[];
  // 有効な紐づけ（released_at が NULL のもの）だけ
  matches: { lostReport: { id: string; number: number } }[];
  // 新しい順。解決済みなら 1 件ある
  handovers: { handedAt: Date; receiverName: string | null }[];
};

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
    features: row.features,
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

// 写真の署名付き URL をまとめて作るために、行に含まれる写真のパスを全部集める
export function photoPathsOf(rows: Pick<FoundItemRow, "photos">[]) {
  return rows.flatMap((row) =>
    row.photos.flatMap((photo) => [photo.storagePath, photo.thumbPath]),
  );
}
