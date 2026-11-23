import { getActor, type Actor } from "@/lib/auth/actor";
import type { Guest } from "@/lib/auth/guest";
import type { Staff } from "@/lib/auth/staff";
import { forbidden, unauthorized } from "./errors";

// Route Handler の最初で呼ぶ。条件に合わなければ ApiError を投げる（apiHandler が 401 / 403 にする）。
// どれも getActor で判定するので、同じリクエストはどの API でも同じ人として扱われる。

// だれでも（ログインしていれば）
export async function requireActor(request: Request): Promise<Actor> {
  const actor = await getActor(request.headers);
  if (!actor) throw unauthorized();
  return actor;
}

// member か admin
export async function requireStaff(request: Request): Promise<Staff> {
  const actor = await requireActor(request);
  if (actor.role === "guest") throw forbidden();
  return actor;
}

// admin だけ
export async function requireAdmin(request: Request): Promise<Staff> {
  const staff = await requireStaff(request);
  if (staff.role !== "admin") throw forbidden();
  return staff;
}

// guest だけ
export async function requireGuest(request: Request): Promise<Guest> {
  const actor = await requireActor(request);
  if (actor.role !== "guest") throw forbidden();
  return { id: actor.id, email: actor.email, name: actor.name };
}
