import { getActor, type Actor } from "@/lib/auth/actor";
import { getGuest, type Guest } from "@/lib/auth/guest";
import { getStaff, type Staff } from "@/lib/auth/staff";
import { forbidden, unauthorized } from "./errors";

// Route Handler の最初で呼ぶ。条件に合わなければ ApiError を投げる（apiHandler が 401 / 403 にする）。

// member か admin
export async function requireStaff(request: Request): Promise<Staff> {
  const staff = await getStaff(request.headers);
  if (!staff) throw unauthorized();
  return staff;
}

// admin だけ
export async function requireAdmin(request: Request): Promise<Staff> {
  const staff = await requireStaff(request);
  if (staff.role !== "admin") throw forbidden();
  return staff;
}

// guest だけ
export async function requireGuest(): Promise<Guest> {
  const guest = await getGuest();
  if (!guest) throw unauthorized();
  return guest;
}

// だれでも（ログインしていれば）
export async function requireActor(request: Request): Promise<Actor> {
  const actor = await getActor(request.headers);
  if (!actor) throw unauthorized();
  return actor;
}
