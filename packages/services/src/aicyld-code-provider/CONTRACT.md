# aicyld-code-provider

一页以内。只写类型与测试表达不了的三样：模块存在的意图、不变量、与其它模块的交集在哪个 hook 点处理。

不变量：

- 只有 AICYLD 登录成功后才启用 Provider。
- JWT 只写入本地加密 Provider 配置，不进入 renderer 状态。
- 登出必须先禁用 Provider，再清理登录态。
