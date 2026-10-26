import {
  AICYLD_PROVIDER_ID,
  resolveJwtExpiration,
  type AicyldPointsWallet,
  type AicyldSmsSendResult,
  type ApiClient,
  type OAuthCallbackParams,
  type OAuthProviderMeta,
  type OAuthTokenSet,
  type OAuthUserProfile,
} from "@zcode/shared";
import type { OAuthProviderRuntimeConfig } from "../oauth/runtimeConfig.js";
import type { OAuthProviderAdapter, OAuthProviderContext } from "../oauth/providers/providerAdapter.js";

interface AicyldUserPayload {
  id?: unknown;
  username?: unknown;
  avatar?: unknown;
  wechatNickname?: unknown;
}

interface AicyldLoginPayload {
  token?: unknown;
  user?: AicyldUserPayload;
  error?: unknown;
  code?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toProfile(user: AicyldUserPayload): OAuthUserProfile {
  const id = text(user.id);
  if (!id) throw new Error("AICYLD 登录响应缺少用户 ID");
  const username = text(user.username) || text(user.wechatNickname) || id;
  const avatarUrl = text(user.avatar);
  return {
    id,
    username,
    displayName: username,
    ...(avatarUrl ? { avatarUrl } : {}),
    rawProfile: user,
  };
}

export class AicyldProviderAdapter implements OAuthProviderAdapter {
  readonly providerId = AICYLD_PROVIDER_ID;
  readonly redirectUri = "";
  readonly apiClient: ApiClient;
  readonly meta: OAuthProviderMeta = {
    id: AICYLD_PROVIDER_ID,
    displayName: "AICYLD 账号",
    enabled: true,
    order: 0,
  };

  private readonly baseUrl: string;

  constructor(config: OAuthProviderRuntimeConfig, apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.baseUrl = (config.baseApiUrl || "https://www.aicyld.com.cn").replace(/\/+$/u, "");
  }

  private async request(path: string, init: RequestInit & { token?: string } = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(20_000),
    });
    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      payload = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
    } catch {
      payload = { error: raw.slice(0, 500) };
    }
    if (!response.ok) {
      const error = new Error(text(payload.error) || `AICYLD 请求失败（HTTP ${response.status}）`);
      Object.assign(error, {
        status: response.status,
        code: text(payload.code) || `HTTP_${response.status}`,
      });
      throw error;
    }
    return payload;
  }

  async sendLoginSms(phone: string): Promise<AicyldSmsSendResult> {
    const payload = await this.request("/api/auth/sms/send", {
      method: "POST",
      body: JSON.stringify({ phone, purpose: "lingdong_code_login" }),
    }) as Record<string, unknown>;
    return {
      cooldown: Math.max(1, Number(payload.cooldown) || 60),
      expiresIn: Math.max(1, Number(payload.expiresIn) || 300),
    };
  }

  async loginWithSms(
    phone: string,
    code: string,
  ): Promise<{ tokenSet: OAuthTokenSet; profile: OAuthUserProfile }> {
    const payload = await this.request("/api/auth/sms/login", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }) as AicyldLoginPayload;
    const accessToken = text(payload.token);
    if (!accessToken || !payload.user) {
      throw new Error(text(payload.error) || "AICYLD 登录响应缺少访问令牌或用户资料");
    }
    const expiration = resolveJwtExpiration(accessToken);
    return {
      tokenSet: {
        accessToken,
        ...(expiration.kind === "valid" ? { expiresAt: expiration.expiresAt } : {}),
      },
      profile: toProfile(payload.user),
    };
  }

  async fetchUserInfo(
    tokenSet: OAuthTokenSet,
    _context: OAuthProviderContext,
  ): Promise<OAuthUserProfile> {
    const payload = await this.request("/api/auth/me", { token: tokenSet.accessToken }) as AicyldUserPayload;
    return toProfile(payload);
  }

  async fetchWallet(tokenSet: OAuthTokenSet): Promise<AicyldPointsWallet> {
    try {
      const payload = await this.request("/api/lingdong-code/v1/wallet", {
        token: tokenSet.accessToken,
      }) as Record<string, unknown>;
      return {
        total: Math.max(0, Number(payload.total) || 0),
        free: Math.max(0, Number(payload.free) || 0),
        subscription: Math.max(0, Number(payload.subscription) || 0),
        paid: Math.max(0, Number(payload.paid) || 0),
      };
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (status !== 404) throw error;
    }

    const payload = await this.request("/api/points/wallet", {
      token: tokenSet.accessToken,
    }) as Record<string, unknown>;
    const subscription = Math.max(0, Number(payload.pointsSub) || 0);
    const paid = Math.max(0, Number(payload.pointsPaid) || 0);
    return {
      total: Math.max(0, Number(payload.total) || subscription + paid),
      free: Math.max(0, Number(payload.pointsFree) || 0),
      subscription,
      paid,
    };
  }

  buildAuthorizeUrl(_context: OAuthProviderContext): string {
    throw new Error("AICYLD 使用手机号验证码登录，不支持 OAuth 跳转");
  }

  parseCallbackParams(_url: string): OAuthCallbackParams {
    throw new Error("AICYLD 不使用 OAuth 回调");
  }

  exchangeToken(
    _params: OAuthCallbackParams,
    _context: OAuthProviderContext,
  ): Promise<OAuthTokenSet> {
    return Promise.reject(new Error("AICYLD 使用手机号验证码登录，不支持 OAuth token 交换"));
  }

  async refreshToken(tokenSet: OAuthTokenSet): Promise<OAuthTokenSet> {
    return tokenSet;
  }

  normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(`AICYLD 登录异常：${String(error)}`);
  }
}
