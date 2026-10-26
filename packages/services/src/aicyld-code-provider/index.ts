import type {
  ProviderConfigObject,
  ProviderId,
  ProviderSettingsCreationResult,
  ProviderSettingsView,
} from "@zcode/provider";

type AicyldProviderSettings = {
  getView(): Promise<ProviderSettingsView>;
  createPersonalProvider(input?: {
    readonly templateId?: string;
    readonly providerName?: string;
    readonly locale?: "zh-CN" | "en-US";
    readonly initialConfig?: ProviderConfigObject;
  }): Promise<ProviderSettingsCreationResult>;
  savePersonalProviderOverlay(
    providerId: ProviderId,
    config: ProviderConfigObject,
    metadata?: { readonly providerName?: string | null; readonly templateId?: string | null; readonly enabled?: boolean },
  ): Promise<ProviderSettingsView>;
};

export const AICYLD_CODE_PROVIDER_TEMPLATE_ID = "aicyld-code";
export const AICYLD_CODE_PROVIDER_NAME = "AICYLD 灵动 Code";

function withApiKey(config: ProviderConfigObject, apiKey: string | null): ProviderConfigObject {
  return {
    ...config,
    access: {
      ...(config.access?.type === "api-key" ? config.access : {}),
      type: "api-key",
      apiKey,
    },
  };
}

export async function syncAicyldCodeProvider(params: {
  settings: AicyldProviderSettings;
  accessToken: string | null;
  enabled: boolean;
}): Promise<void> {
  const view = await params.settings.getView();
  const existing = view.providers.find(
    (provider) => provider.templateId === AICYLD_CODE_PROVIDER_TEMPLATE_ID,
  );

  if (!existing) {
    if (!params.accessToken || !params.enabled) return;
    const created = await params.settings.createPersonalProvider({
      templateId: AICYLD_CODE_PROVIDER_TEMPLATE_ID,
      providerName: AICYLD_CODE_PROVIDER_NAME,
      locale: "zh-CN",
      initialConfig: {
        access: { type: "api-key", apiKey: params.accessToken },
      },
    });
    const personal = created.view.providers.find(
      (provider) => provider.providerId === created.providerId,
    )?.personalConfig ?? {};
    await params.settings.savePersonalProviderOverlay(
      created.providerId,
      withApiKey(personal, params.accessToken),
      {
        templateId: AICYLD_CODE_PROVIDER_TEMPLATE_ID,
        providerName: AICYLD_CODE_PROVIDER_NAME,
        enabled: true,
      },
    );
    return;
  }

  const base = existing.personalConfig ?? existing.effectiveConfig;
  await params.settings.savePersonalProviderOverlay(
    existing.providerId,
    withApiKey(base, params.enabled ? params.accessToken : null),
    {
      templateId: AICYLD_CODE_PROVIDER_TEMPLATE_ID,
      providerName: AICYLD_CODE_PROVIDER_NAME,
      enabled: params.enabled,
    },
  );
}
