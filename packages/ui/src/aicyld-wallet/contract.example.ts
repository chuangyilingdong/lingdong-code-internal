/**
 * aicyld-wallet 标准调用示例：agent 靠模仿写代码，这里放的就是该模仿的那份。
 */
import type { AicyldWalletContract } from "./contract.js";

export async function exampleAicyldWallet(contract: AicyldWalletContract): Promise<void> {
  await contract.refresh();
}
