import { getGuest, type Guest } from "./guest";
import { getAccessStaff, getDevStaff, type Staff } from "./staff";

// API を呼んだ人。Cloudflare Access の staff（member / admin）を先に見て、なければ guest を見る。
// staff のホストから guest と共有の API（申請の詳細やチャットなど）を呼んでも、
// admin・member として判定されるようにするため（設計仕様「最初に動かして確かめること」5）。
// ローカルの DEV_STAFF_EMAIL は最後に見る（先に見ると、ローカルで guest のログインを試せないため）。
export type Actor = Staff | ({ role: "guest" } & Guest);

export async function getActor(headers: Headers): Promise<Actor | null> {
  const staff = await getAccessStaff(headers);
  if (staff) return staff;

  // Access の JWT が付いているのに検証できなかったときは、guest として扱わずに止める
  // （同じブラウザに guest の Cookie が残っている staff が、guest として書き込まないように）
  if (headers.has("cf-access-jwt-assertion")) return null;

  const guest = await getGuest();
  if (guest) return { role: "guest", ...guest };

  return getDevStaff();
}
