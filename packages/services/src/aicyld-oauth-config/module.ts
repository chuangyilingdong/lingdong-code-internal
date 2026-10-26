/**
 * aicyld-oauth-config 模块清单（architecture-governance managed 模块）。
 * 层：app。修改 requires 时同步更新 architecture-policy.yaml（检查器会校验两者一致）。
 */
export const aicyldOauthConfigModule = {
  id: "aicyld-oauth-config",
  requires: ["services", "shared"],
  provides: ["aicyld-oauth-config"],
  publicEntrypoints: ["index.ts", "contract.ts"],
} as const;
