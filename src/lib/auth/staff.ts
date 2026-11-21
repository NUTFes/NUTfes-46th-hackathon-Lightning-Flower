import { createRemoteJWKSet, jwtVerify } from "jose";

// member / admin の判定。Cloudflare Access が付ける JWT を検証してメールを取り出す。
// 詳しくは Notion の設計仕様「API設計」の共通ルール（認証）。

export type StaffRole = "admin" | "member";
export type Staff = { email: string; role: StaffRole };

const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
const audience = process.env.CF_ACCESS_AUD;
const adminEmail = process.env.ADMIN_EMAIL;

const jwks = teamDomain
  ? createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
  : null;

function toStaff(email: string): Staff {
  return { email, role: email === adminEmail ? "admin" : "member" };
}

// ローカルには Cloudflare Access がないので、`next dev` のときだけ
// DEV_STAFF_EMAIL のメールでログインしたことにする。Vercel では使わない。
function devStaff(): Staff | null {
  const email = process.env.DEV_STAFF_EMAIL;
  if (process.env.NODE_ENV !== "development" || process.env.VERCEL || !email) {
    return null;
  }
  return toStaff(email);
}

// 検証できなければ null を返す（呼び出し側で 401 にする）。
export async function getStaff(headers: Headers): Promise<Staff | null> {
  const dev = devStaff();
  if (dev) return dev;

  const token = headers.get("cf-access-jwt-assertion");
  if (!token || !jwks || !audience) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${teamDomain}`,
      audience,
    });
    return typeof payload.email === "string" ? toStaff(payload.email) : null;
  } catch {
    return null;
  }
}
