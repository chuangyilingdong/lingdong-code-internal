/**
 * aicyld-code-provider 对外契约：调用方要想正确调用就必须知道的一切都写在这里；其余对外不可见。
 * 每个方法注释写清：前置/后置条件、幂等性、发出哪些事件、是否等待持久化。
 */
export interface AicyldCodeProviderContract {
  /**
   * 让 AICYLD 专属 Provider 与当前登录态一致。
   * accessToken 为空或 enabled=false 时关闭 Provider；操作幂等，并等待配置落盘。
   */
  sync(input: { accessToken: string | null; enabled: boolean }): Promise<void>;
}
