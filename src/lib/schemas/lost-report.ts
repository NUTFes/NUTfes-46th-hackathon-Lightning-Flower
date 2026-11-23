import {
  CancelReason,
  CategoryRef,
  DateTime,
  ItemColor,
  LostStatus,
  paginated,
  PickupMethod,
  PageQuery,
} from "./common";
import { z } from "./zod";

// 遺失物申請（Notion 設計仕様「API設計」の LostReport）。
// guest に返す形（LostReport）と、admin に返す形（LostReportForAdmin）がある。
// guest には、紐づいた拾得物の中身を返さない。

export const LostReport = z
  .object({
    id: z.uuid(),
    displayNumber: z.string().openapi({ example: "申-00118" }),
    status: LostStatus,
    category: CategoryRef,
    color: ItemColor,
    brand: z.string().nullable(),
    lostPlace: z.string(),
    lostAt: DateTime,
    note: z.string().nullable(),
    verified: z.boolean(), // admin が本人確認 OK にしたか
    pickup: z
      .object({ method: PickupMethod, note: z.string().nullable() })
      .nullable(),
    cancel: z
      .object({
        reason: CancelReason,
        note: z.string().nullable(),
        cancelledAt: DateTime,
      })
      .nullable(),
    createdAt: DateTime, // 受付日時
  })
  .openapi("LostReport");

export const LostReportForAdmin = LostReport.extend({
  guest: z.object({ email: z.string(), displayName: z.string().nullable() }),
  activeMatch: z
    .object({ foundItemId: z.uuid(), displayNumber: z.string() })
    .nullable(),
  awaitingReply: z.boolean(), // 最新のメッセージが guest のもの
}).openapi("LostReportForAdmin");

export const LostReportList = paginated(LostReport).openapi("LostReportList");
export const LostReportForAdminList = paginated(LostReportForAdmin).openapi(
  "LostReportForAdminList",
);

export type LostReport = z.infer<typeof LostReport>;
export type LostReportForAdmin = z.infer<typeof LostReportForAdmin>;
export type LostReportList = z.infer<typeof LostReportList>;
// POST /api/lost-reports のリクエストボディ用
export const CreateLostReportBody = z
  .object({
    categoryId: z.number().int().min(1).max(32767),
    color: ItemColor,
    brand: z.string().trim().min(1).nullable().optional(),
    lostPlace: z.string().trim().min(1),
    lostAt: DateTime,
    note: z.string().trim().min(1).nullable().optional(),
  })
  .openapi("CreateLostReportBody");

export type CreateLostReportBody = z.infer<typeof CreateLostReportBody>;

// GET /api/my/lost-reports のクエリ用（?page=1&limit=20）
export const MyLostReportListQuery = PageQuery;

// URL の /api/lost-reports/{id} の id 用
export const LostReportIdParams = z.object({
  id: z.uuid(),
});

// PATCH /api/lost-reports/{id} のリクエストボディ用（変更したい項目だけ送れる）
// status や verifiedAt などのシステム管理項目は変更させないため含めない
export const LostReportPatchBody = z
  .object({
    categoryId: z.number().int().min(1).max(32767),
    color: ItemColor,
    brand: z.string().trim().min(1).nullable(),
    lostPlace: z.string().trim().min(1),
    lostAt: DateTime,
    note: z.string().trim().min(1).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "更新する項目を 1 つ以上指定してください",
  })
  .openapi("LostReportPatchBody");

export type LostReportPatchBody = z.infer<typeof LostReportPatchBody>;
