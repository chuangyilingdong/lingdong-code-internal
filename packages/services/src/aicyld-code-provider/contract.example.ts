/**
 * aicyld-code-provider 标准调用示例：agent 靠模仿写代码，这里放的就是该模仿的那份。
 */
import type { AicyldCodeProviderContract } from "./contract.js";

export async function exampleAicyldCodeProvider(contract: AicyldCodeProviderContract): Promise<void> {
  await contract.sync({ accessToken: "aicyld-session-token", enabled: true });
}
