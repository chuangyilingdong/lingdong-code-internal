/**
 * aicyld-oauth-config 标准调用示例：agent 靠模仿写代码，这里放的就是该模仿的那份。
 */
import type { AicyldOauthConfigContract } from "./contract.js";

export function exampleAicyldOauthConfig(contract: AicyldOauthConfigContract): string {
  return contract.baseUrl({ AICYLD_BASE_URL: "https://www.aicyld.com.cn" });
}
