import { z } from "./zod";

const nonNegativeInt = z.number().int().min(0);

export const AdminDashboard = z
  .object({
    foundItemCount: nonNegativeInt,
    lostReportCount: nonNegativeInt,
    awaitingReplyCount: nonNegativeInt,
    resolvedCount: nonNegativeInt,
  })
  .openapi("AdminDashboard");

export type AdminDashboard = z.infer<typeof AdminDashboard>;
