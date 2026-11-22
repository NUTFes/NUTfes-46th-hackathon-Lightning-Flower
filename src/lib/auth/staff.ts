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
// DEV_STAFF_EMAIL のメールでログインしたことにする。Vercel のデプロイでは使わない。
// （`vercel env pull` は VERCEL=1・VERCEL_ENV=development を書くので、VERCEL では判定しない）
export function getDevStaff(): Staff | null {
  const email = process.env.DEV_STAFF_EMAIL;
  const vercelEnv = process.env.VERCEL_ENV;
  if (
    process.env.NODE_ENV !== "development" ||
    vercelEnv === "production" ||
    vercelEnv === "preview" ||
    !email
  ) {
    return null;
  }
  return toStaff(email);
}

// member / admin を判定する。ローカルでは DEV_STAFF_EMAIL を先に見る。
// 検証できなければ null を返す（呼び出し側で 401 にする）。
export async function getStaff(headers: Headers): Promise<Staff | null> {
  return getDevStaff() ?? (await getAccessStaff(headers));
}

// Cloudflare Access の JWT だけを見る（DEV_STAFF_EMAIL は見ない）
export async function getAccessStaff(headers: Headers): Promise<Staff | null> {
  const token = headers.get("cf-access-jwt-assertion");
  if (!token || !jwks || !audience) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${teamDomain}`,
      audience,
    });
    return typeof payload.email === "string" ? toStaff(payload.email) : null;
  } catch (error) {
    // 署名・期限・aud・iss の不一致や、公開鍵の取得の失敗。設定の誤りに気づけるようにログに出す
    console.warn("Cloudflare Access の JWT を検証できませんでした:", error);
    return null;
  }
}
