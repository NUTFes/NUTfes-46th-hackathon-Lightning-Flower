import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const TEAM_DOMAIN = "otoshiru.cloudflareaccess.com";
const AUD = "test-aud";
const ADMIN_EMAIL = "admin@example.com";

// Cloudflare から公開鍵を取りに行く代わりに、テストで作った鍵の JWKS を返す
const keys = vi.hoisted(() => ({
  jwks: null as ReturnType<typeof createLocalJWKSet> | null,
}));
vi.mock("jose", async (importOriginal) => ({
  ...(await importOriginal<typeof import("jose")>()),
  createRemoteJWKSet: () => keys.jwks!,
}));

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;
let accessKey: KeyPair;
let otherKey: KeyPair;

beforeAll(async () => {
  accessKey = await generateKeyPair("RS256");
  otherKey = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(accessKey.publicKey)),
    kid: "k1",
    alg: "RS256",
  };
  keys.jwks = createLocalJWKSet({ keys: [jwk] });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// staff.ts は import したときに環境変数を読むので、環境変数を入れてから読み込み直す
async function loadGetStaff(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return (await import("./staff")).getStaff;
}

const productionEnv = {
  NODE_ENV: "production",
  CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN,
  CF_ACCESS_AUD: AUD,
  ADMIN_EMAIL,
};

async function sign(
  payload: JWTPayload,
  options: {
    key?: KeyPair;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  } = {},
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(options.issuer ?? `https://${TEAM_DOMAIN}`)
    .setAudience(options.audience ?? AUD)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign((options.key ?? accessKey).privateKey);
}

function withToken(token: string) {
  return new Headers({ "cf-access-jwt-assertion": token });
}

describe("getStaff：Cloudflare Access の JWT", () => {
  it("正しい JWT なら member として通す", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign({ email: "member@example.com" });
    expect(await getStaff(withToken(token))).toEqual({
      email: "member@example.com",
      role: "member",
    });
  });

  it("ADMIN_EMAIL なら admin にする", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign({ email: ADMIN_EMAIL });
    expect(await getStaff(withToken(token))).toEqual({
      email: ADMIN_EMAIL,
      role: "admin",
    });
  });

  it("別の鍵で署名された JWT は通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign({ email: ADMIN_EMAIL }, { key: otherKey });
    expect(await getStaff(withToken(token))).toBeNull();
  });

  it("aud が違う JWT は通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign({ email: ADMIN_EMAIL }, { audience: "other-aud" });
    expect(await getStaff(withToken(token))).toBeNull();
  });

  it("iss が違う JWT は通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign(
      { email: ADMIN_EMAIL },
      { issuer: "https://evil.cloudflareaccess.com" },
    );
    expect(await getStaff(withToken(token))).toBeNull();
  });

  it("期限切れの JWT は通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    const token = await sign({ email: ADMIN_EMAIL }, { expiresIn: "-1m" });
    expect(await getStaff(withToken(token))).toBeNull();
  });

  it("JWT の形をしていない値は通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    expect(await getStaff(withToken("not-a-jwt"))).toBeNull();
  });

  it("JWT がなければ通さない", async () => {
    const getStaff = await loadGetStaff(productionEnv);
    expect(await getStaff(new Headers())).toBeNull();
  });
});

describe("getStaff：ローカル用の DEV_STAFF_EMAIL", () => {
  it("next dev では DEV_STAFF_EMAIL でログインしたことにする", async () => {
    const getStaff = await loadGetStaff({
      NODE_ENV: "development",
      DEV_STAFF_EMAIL: "member.local@example.com",
    });
    expect(await getStaff(new Headers())).toEqual({
      email: "member.local@example.com",
      role: "member",
    });
  });

  it("本番では DEV_STAFF_EMAIL を使わない", async () => {
    const getStaff = await loadGetStaff({
      ...productionEnv,
      DEV_STAFF_EMAIL: "member.local@example.com",
    });
    expect(await getStaff(new Headers())).toBeNull();
  });

  it("Vercel では next dev でも DEV_STAFF_EMAIL を使わない", async () => {
    const getStaff = await loadGetStaff({
      NODE_ENV: "development",
      VERCEL: "1",
      DEV_STAFF_EMAIL: "member.local@example.com",
    });
    expect(await getStaff(new Headers())).toBeNull();
  });
});
