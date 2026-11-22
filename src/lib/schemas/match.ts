import { LostReportParams } from "./lost-report";
import { z } from "./zod";

// 紐づけ・解除（/api/lost-reports/{id}/matches）の入力

// URL の [id]/matches/[foundItemId]
export const MatchParams = LostReportParams.extend({ foundItemId: z.uuid() });

// POST /api/lost-reports/{id}/matches の本文
export const MatchCreateBody = z
  .object({ foundItemId: z.uuid() })
  .openapi("MatchCreateBody");

export type MatchCreateBody = z.infer<typeof MatchCreateBody>;
