import { z } from "./zod";

// GET /api/health の返り値
export const HealthOk = z
  .object({ status: z.literal("ok"), db: z.literal("ok") })
  .openapi("HealthOk");

export const HealthError = z
  .object({ status: z.literal("error"), db: z.literal("unreachable") })
  .openapi("HealthError");

export type HealthOk = z.infer<typeof HealthOk>;
export type HealthError = z.infer<typeof HealthError>;
