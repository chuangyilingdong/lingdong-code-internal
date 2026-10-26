import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "@zcode/shared";
import type { OAuthProviderRuntimeConfig } from "../src/oauth/runtimeConfig.js";
import { AicyldProviderAdapter } from "../src/aicyld-oauth-adapter/index.js";

const config: OAuthProviderRuntimeConfig = {
  id: "aicyld",
  displayName: "AICYLD",
  enabled: true,
  order: 0,
  authorizeUrl: "",
  tokenUrl: "",
  userinfoUrl: "",
  appId: "lingdong-code",
  redirectUri: "",
  baseApiUrl: "https://www.aicyld.com.cn",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AicyldProviderAdapter", () => {
  it("uses the AICYLD desktop SMS endpoints and maps the user profile", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/sms/send")) {
        return jsonResponse({ ok: true, cooldown: 60, expiresIn: 300 });
      }
      if (url.endsWith("/api/auth/sms/login")) {
        expect(JSON.parse(String(init?.body))).toEqual({ phone: "13800138000", code: "123456" });
        return jsonResponse({
          token: "aicyld.jwt.token",
          user: { id: "user-1", username: "测试用户", avatar: "https://example.com/avatar.png" },
        });
      }
      return jsonResponse({ error: "not found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new AicyldProviderAdapter(config, {} as ApiClient);
    await expect(adapter.sendLoginSms("13800138000")).resolves.toEqual({ cooldown: 60, expiresIn: 300 });
    const result = await adapter.loginWithSms("13800138000", "123456");

    expect(result.tokenSet.accessToken).toBe("aicyld.jwt.token");
    expect(result.profile).toMatchObject({
      id: "user-1",
      username: "测试用户",
      displayName: "测试用户",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("reads the AICYLD gateway wallet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      total: 42,
      free: 2,
      subscription: 10,
      paid: 30,
    })));

    const adapter = new AicyldProviderAdapter(config, {} as ApiClient);
    await expect(adapter.fetchWallet({ accessToken: "token" })).resolves.toEqual({
      total: 42,
      free: 2,
      subscription: 10,
      paid: 30,
    });
  });
});
