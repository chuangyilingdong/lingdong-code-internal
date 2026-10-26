# 灵动Code × AICYLD 账号与积分接入

## 背景

灵动Code 基于 ZCode 3.16.2 开源代码。产品需要退出 ZCode 云账号、套餐、订阅与额度体系，统一使用 AICYLD 主站账号和积分。

编码 Agent 与画布生成不同：一次任务会调用模型多次，每次的输入、输出和缓存命中 token 数只能在上游响应完成后确定。因此不能沿用“生成前预扣固定积分”的方式，必须由 AICYLD 模型网关在上游响应完成后按真实 usage 结算。

## 真实上游与计费基线

- 上游统一使用 ZhenZhen AI / Seedance：`https://api.seedance.nz`。
- 网关配置的 Base URL 为 `https://api.seedance.nz/v1`，实际文本请求为 `POST /v1/chat/completions`。
- 灵动Code 文本模型与画布审片一致：`qwen/qwen3.8-omni-flash`。
- 该模型上下文上限 1,000,000 tokens，支持文本、图片、音频和视频输入，以及流式输出和工具调用。
- 上游参考价格（人民币 / 1M tokens）：输入 ¥0.941176、输出 ¥3.176471、缓存读取 ¥0.117647。
- AICYLD 按 1 积分 = ¥0.1 折算，并沿用画布默认规则的 1.6 倍上游成本倍率。默认每 1K token 积分单价为：输入 0.015059、输出 0.050824、缓存输入 0.001882；每次请求最低 1 积分。
- 上述模型、上下文、输出上限和单价全部允许通过 `LINGDONG_CODE_MODELS_JSON` 覆盖；生产密钥只放主站服务端环境变量，不进入客户端或仓库。
- 生产数据库只允许通过增量 migration 创建 `lingdong_code_usage`；不得使用 `prisma db push` 同步整库，避免删除生产库中尚未回写的既有表和字段。

## 本期范围

- Web 手机远控不纳入本次灵动Code 接入验收，也不作为内部测试包的验收项。
- 自动更新后续需要，本期 Windows 内部测试包先不做更新通道验收。

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
4. 登录页的品牌标识复用全局灵动Code Logo，不在登录面板内单独绘制文字占位；登录页不展示“使用 AICYLD 账号与积分”和模型结算说明文案。
5. 用户可跳转主站注册、积分中心与充值页：
   - `https://www.aicyld.com.cn/register`
   - `https://www.aicyld.com.cn/points`
   - `https://www.aicyld.com.cn/subscription?tab=recharge`
6. 登出时清除 AICYLD 令牌、用户资料，并禁用自动维护的灵动Code Provider。

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
- 同一用户按“每 5 积分一个并发槽”限制未结算上游请求：`min(10, max(1, floor(可用积分 / 5)))`；余额不足一个槽时仍允许 1 个请求，槽满返回 HTTP 429，不进行上游调用。

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
- 启动加载、标题栏、欢迎空态、About 等所有用户可见 Logo 统一使用灵动Code/AICYLD 资产，不再出现 ZCode 的 Z 标识。
- 模型设置默认只展示 AICYLD 灵动 Code Provider；不展示 BigModel、Start Plan、Coding Plan、个人/团队套餐价格卡或订阅入口。
- 模型设置只展示 AICYLD 内置文本模型，不提供添加、编辑或删除自定义供应商、API Key、Base URL、API 格式和模型列表的能力。
- 聊天模型菜单只展示内置文本模型的用户可读名称，不把内部模型 ID 作为产品名称。
- Agent 主会话、子智能体和工作流的模型可见身份文案统一使用“灵动Code”，不得再以 ZCode 自称。

## 验收

- 未登录启动只显示 AICYLD 手机号验证码登录，品牌 Logo 与标题栏/启动页一致，且不展示已移除的账号积分说明与结算说明文案。
- 验证码发送、登录、重启恢复、登出均使用 AICYLD 账号。
- 已登录 AICYLD 用户重启后，即使旧 `providerFamilyDomain` 为空且内置模型可用，也不得重新显示登录页。
- 侧栏显示 AICYLD 积分余额，充值/积分中心跳转正确。
- 登录后模型请求经 AICYLD 网关完成，响应 usage 可在 usage 表追溯并扣减积分。
- 上游失败不扣分；流式成功按最后 usage 帧结算；重复完成事件不重复扣分。
- 设置中不再出现 ZCode 订阅、升级或 Rewards 入口。
- 启动页、标题栏和欢迎空态不出现旧 ZCode Logo。
- 托盘 tooltip、打开应用菜单和关于菜单统一显示灵动Code，不出现 ZCode 品牌。
- 设置-模型设置中只出现 AICYLD 灵动 Code，不出现 BigModel/Start Plan/Coding Plan/套餐卡片。
- 主会话与子智能体的 system prompt 使用灵动Code 身份，模型被问及身份时不再回复“我是 ZCode”。
- Web 分享页标题、继续入口和机器人帮助/状态文案统一显示灵动Code，不出现旧 ZCode 品牌。
- 余额为 0 的新请求返回 402 且不调用上游；余额不足时实际扣分不超过可用余额，usage 标记为 `partial`，积分不得变为负数。
- 可用积分 1-9、10-14、50+ 时每用户并发上限分别为 1、2、10；超过上限的请求返回 429 且不调用上游。
- Web 手机远控不纳入本期实现、品牌和验收范围。
