import { AICYLD_PROVIDER_ID } from "@zcode/shared";
import type { OAuthProviderRuntimeConfig } from "../oauth/runtimeConfig.js";

export const AICYLD_DEFAULT_BASE_URL = "https://www.aicyld.com.cn";

export function resolveAicyldBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AICYLD_BASE_URL?.trim() || AICYLD_DEFAULT_BASE_URL).replace(/\/+$/u, "");
}

export function createAicyldProviderRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): OAuthProviderRuntimeConfig {
  return {
    id: AICYLD_PROVIDER_ID,
    displayName: "AICYLD",
    enabled: true,
    order: 0,
    authorizeUrl: "",
    tokenUrl: "",
    userinfoUrl: "",
    appId: "lingdong-code",
    redirectUri: "",
    baseApiUrl: resolveAicyldBaseUrl(env),
  };
}
