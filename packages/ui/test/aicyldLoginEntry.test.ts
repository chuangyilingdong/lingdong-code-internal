import {
  AICYLD_PROVIDER_ID,
  BIGMODEL_PROVIDER_ID,
  type OAuthProviderMeta,
  ZAI_PROVIDER_ID,
} from "@zcode/shared";
import { describe, expect, it } from "vitest";
import {
  resolveLoginRetryProvider,
  resolveVisibleLoginProviders,
} from "@/WelcomeScreen.js";

function createProvider(
  overrides: Partial<OAuthProviderMeta>,
): OAuthProviderMeta {
  return {
    id: overrides.id ?? "custom-oauth",
    displayName: overrides.displayName ?? "Custom OAuth",
    enabled: overrides.enabled ?? true,
    order: overrides.order ?? 10,
  };
}

describe("AICYLD login entry", () => {
  it("只展示 AICYLD 登录入口", () => {
    const providers = resolveVisibleLoginProviders([
      createProvider({ id: ZAI_PROVIDER_ID, displayName: "Z.ai", order: 0 }),
      createProvider({ id: BIGMODEL_PROVIDER_ID, displayName: "BigModel", order: 1 }),
      createProvider({ id: AICYLD_PROVIDER_ID, displayName: "AICYLD", order: 2 }),
    ]);

    expect(providers.map((provider) => provider.id)).toEqual([AICYLD_PROVIDER_ID]);
  });

  it("重试始终回到 AICYLD 短信登录", () => {
    const providers = [
      createProvider({ id: ZAI_PROVIDER_ID, displayName: "Z.ai", order: 0 }),
      createProvider({ id: AICYLD_PROVIDER_ID, displayName: "AICYLD", order: 1 }),
    ];

    expect(
      resolveLoginRetryProvider({
        pendingProvider: ZAI_PROVIDER_ID,
        lastAttemptProvider: ZAI_PROVIDER_ID,
        providers,
      }),
    ).toBe(AICYLD_PROVIDER_ID);
  });
});
