export const AICYLD_CODE_PROVIDER_TEMPLATE_ID = "aicyld-code";
export const AICYLD_CODE_MODEL_ID = "lingdong-code";

export function isAicyldCodeProviderId(providerId: string | undefined): boolean {
  return providerId === AICYLD_CODE_PROVIDER_TEMPLATE_ID;
}
