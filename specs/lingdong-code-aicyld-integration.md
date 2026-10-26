# 灵动Code × AICYLD 账号与积分接入

## 背景

灵动Code 基于 ZCode 3.16.2 开源代码。产品需要退出 ZCode 云账号、套餐、订阅与额度体系，统一使用 AICYLD 主站账号和积分。

编码 Agent 与画布生成不同：一次任务会调用模型多次，每次的输入、输出和缓存命中 token 数只能在上游响应完成后确定。因此不能沿用“生成前预扣固定积分”的方式，必须由 AICYLD 模型网关在上游响应完成后按真实 usage 结算。

## 所有权

- **账号唯一真源**：AICYLD 主站用户系统。灵动Code 只保存登录令牌与展示资料。
- **积分唯一真源**：AICYLD 主站 `User.pointsFree/pointsSub/pointsPaid` 与 `PointsLedger/PointsLot`。
- **模型调用结算唯一所有者**：AICYLD 主站的灵动Code 模型网关。
- **客户端职责**：展示账号与积分、发起短信登录、充值跳转；不直接写积分账本。
- **Provider 配置**：登录成功后，Host 自动维护一个 `AICYLD 灵感模型` Provider，用 AICYLD JWT 访问主站网关；登出时禁用并清空其访问令牌。

## 账号与登录

1. 灵动Code 只显示 AICYLD 登录入口，不再显示 Z.ai / BigModel / ZCode 账号登录。
2. 首期支持手机号验证码登录，复用主站：
   - `POST /api/auth/sms/send`
   - `POST /api/auth/sms/login`
3. 登录成功后保存 30 天 AICYLD JWT 和用户资料；启动时只按 JWT 本地过期时间恢复展示态。
4. 用户可跳转主站注册、积分中心与充值页：
   - `https://www.aicyld.com.cn/register`
   - `https://www.aicyld.com.cn/points`
   - `https://www.aicyld.com.cn/subscription?tab=recharge`
5. 登出时清除 AICYLD 令牌、用户资料，并禁用自动维护的灵动Code Provider。

## 模型网关与结算

主站新增 OpenAI Chat Completions 兼容网关：

- `GET /api/lingdong-code/v1/models`
- `POST /api/lingdong-code/v1/chat/completions`
- `GET /api/lingdong-code/v1/wallet`

所有接口使用 `Authorization: Bearer <AICYLD JWT>`。

网关将请求原样转发给配置的上游 OpenAI 兼容模型服务，并保留流式 SSE、工具调用、图片与多模态内容。客户端不接触上游模型密钥。

### 结算时序

```text
灵动Code -> AICYLD 网关: chat/completions
AICYLD 网关 -> 上游模型: 转发请求（流式时请求 include_usage）
上游模型 -> AICYLD 网关: 响应 + usage
AICYLD 网关 -> 主站积分服务: 按真实 input/output/cached token 扣减
AICYLD 网关 -> 灵动Code: 原样返回模型响应
```

规则：

- 请求开始时只校验 AICYLD 登录态与可消费积分是否大于 0，不预扣。
- 流式响应结束后从最后的 usage 帧结算；非流式响应读取响应体 usage。
- 结算幂等键优先使用上游响应 `id`，缺失时使用服务端生成的请求 ID。
- 积分按 `ceil(input/1000 * inputRate + output/1000 * outputRate)` 计算，最低 1 分；缓存输入按可配置折扣计费。
- 若响应完成时余额不足以覆盖全部实际费用，只扣可用余额，并把 usage 记录标记为 `partial`；后续请求在余额大于 0 前拒绝。
- 上游错误、网络中断、无有效 usage 时不扣积分。
- 结算记录写入独立 usage 表，保留 token、模型、扣分、余额与状态，供后台对账。

## 客户端 Provider

内置模板 `aicyld-code`：

- API：`openai-chat-completions`
- Base URL：`https://www.aicyld.com.cn/api/lingdong-code/v1`
- 模型：由主站网关配置暴露；客户端内置默认模型 ID
- 访问：`api-key`，值由登录流程自动写入 AICYLD JWT，不要求用户手动填写

登录后 Provider 自动启用；JWT 续期或重新登录时覆盖旧值；登出时禁用。

## 移除范围

- 不再展示 ZCode/Z.ai/BigModel 账号登录按钮、Coding Plan 购买/升级、Rewards、ZCode 订阅额度入口。
- 外部模型 Provider 的通用配置能力可保留，但默认产品路径只展示 AICYLD 账号和灵动Code Provider。
- 内部 `@zcode/*` 包名、协议字段和持久化 key 首期保留，避免破坏运行时与升级兼容；所有用户可见品牌文案改为“灵动Code”。

## 验收

- 未登录启动只显示 AICYLD 手机号验证码登录。
- 验证码发送、登录、重启恢复、登出均使用 AICYLD 账号。
- 侧栏显示 AICYLD 积分余额，充值/积分中心跳转正确。
- 登录后模型请求经 AICYLD 网关完成，响应 usage 可在 usage 表追溯并扣减积分。
- 上游失败不扣分；流式成功按最后 usage 帧结算；重复完成事件不重复扣分。
- 设置中不再出现 ZCode 订阅、升级或 Rewards 入口。
