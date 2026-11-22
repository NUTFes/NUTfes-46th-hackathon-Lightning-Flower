import { z } from "./zod";

// 紐づけ・解除・本人確認（/api/lost-reports/{id}/matches・/verify）の入力

// URL の [id]（遺失物申請）
export const LostReportParams = z.object({ id: z.uuid() });

// URL の [id]/matches/[foundItemId]
export const MatchParams = LostReportParams.extend({ foundItemId: z.uuid() });

// POST /api/lost-reports/{id}/matches の本文
export const MatchCreateBody = z
  .object({ foundItemId: z.uuid() })
  .openapi("MatchCreateBody");

export type MatchCreateBody = z.infer<typeof MatchCreateBody>;
