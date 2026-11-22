import { z } from "./zod";

// GET /api/me の返り値。consented（個人情報の取り扱いに同意したか）は guest のときだけ
export const Me = z
  .discriminatedUnion("role", [
    z.object({
      role: z.enum(["admin", "member"]),
      email: z.string(),
    }),
    z.object({
      role: z.literal("guest"),
      email: z.string(),
      consented: z.boolean(),
    }),
  ])
  .openapi("Me");

export type Me = z.infer<typeof Me>;
