import { getGuest, type Guest } from "./guest";
import { getAccessStaff, getDevStaff, type Staff } from "./staff";

// API を呼んだ人。Cloudflare Access の staff（member / admin）を先に見て、なければ guest を見る。
// staff のホストから guest と共有の API（申請の詳細やチャットなど）を呼んでも、
// admin・member として判定されるようにするため（設計仕様「最初に動かして確かめること」5）。
// ローカルの DEV_STAFF_EMAIL は最後に見る（先に見ると、ローカルで guest のログインを試せないため）。
export type Actor =
  ({ kind: "staff" } & Staff) | ({ kind: "guest"; role: "guest" } & Guest);

export async function getActor(headers: Headers): Promise<Actor | null> {
  const staff = await getAccessStaff(headers);
  if (staff) return { kind: "staff", ...staff };

  const guest = await getGuest();
  if (guest) return { kind: "guest", role: "guest", ...guest };

  const dev = getDevStaff();
  if (dev) return { kind: "staff", ...dev };

  return null;
}
