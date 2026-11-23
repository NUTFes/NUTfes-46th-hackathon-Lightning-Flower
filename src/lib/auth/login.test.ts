import { describe, expect, it } from "vitest";
import { requestOrigin } from "./login";

function request(headers: Record<string, string>) {
  return new Request("http://localhost:3000/auth/login", { headers });
}

describe("requestOrigin", () => {
  it("Host からオリジンを作る（Docker で APP_PORT を変えたときなど）", () => {
    expect(requestOrigin(request({ host: "localhost:3001" }))).toBe(
      "http://localhost:3001",
    );
  });

  it("X-Forwarded-Host・X-Forwarded-Proto があればそちらを使う（Vercel）", () => {
    expect(
      requestOrigin(
        request({
          host: "internal",
          "x-forwarded-host": "otoshiru.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://otoshiru.example.com");
  });

  it("並んだ値は最初のものを使う", () => {
    expect(
      requestOrigin(
        request({
          "x-forwarded-host": "a.example.com, b.example.com",
          "x-forwarded-proto": "https, http",
        }),
      ),
    ).toBe("https://a.example.com");
  });

  it.each([
    [{ host: "evil.example/path" }],
    [{ host: "user@evil.example" }],
    [{ host: "a.example", "x-forwarded-proto": "javascript" }],
  ])("形がおかしければ request.url のオリジンにする（%j）", (headers) => {
    expect(requestOrigin(request(headers))).toBe("http://localhost:3000");
  });
});
