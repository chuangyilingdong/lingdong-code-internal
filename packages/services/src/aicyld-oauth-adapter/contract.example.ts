/**
 * aicyld-oauth-adapter 标准调用示例：agent 靠模仿写代码，这里放的就是该模仿的那份。
 */
import type { AicyldOauthAdapterContract } from "./contract.js";

export async function exampleAicyldOauthAdapter(contract: AicyldOauthAdapterContract): Promise<void> {
  await contract.sendLoginSms("13800138000");
  await contract.loginWithSms("13800138000", "123456");
}
