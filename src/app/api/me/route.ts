import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { guests } from "@/db/schema";
import { requireActor } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import type { Me } from "@/lib/schemas/me";

// ログイン中の人のロールとメール。guest には、個人情報の取り扱いに同意済みかも返す
export const GET = apiHandler(async (request) => {
  const actor = await requireActor(request);

  if (actor.role !== "guest") {
    return Response.json({ role: actor.role, email: actor.email } satisfies Me);
  }

  const [guest] = await getDb()
    .select({ agreedAt: guests.agreedAt })
    .from(guests)
    .where(eq(guests.id, actor.id));

  return Response.json({
    role: "guest",
    email: actor.email,
    consented: guest?.agreedAt != null,
  } satisfies Me);
});
