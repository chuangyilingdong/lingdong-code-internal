# 灵动Code 业务数据隔离

## 背景

本机同时安装 ZCode 与灵动Code。两者若共用 `${HOME}/.zcode`，会共享任务索引、工作区历史、模型 Provider、凭据和 Agent 插件状态，并允许两个进程并发写入同一组 SQLite/JSON 文件。

灵动Code 是独立产品身份，默认必须使用独立业务数据根；ZCode 的数据仍由 ZCode 自己持有。首期不迁移 ZCode 的任务、工作区、第三方 Provider 或登录态。

## 所有权

- **灵动Code 业务数据所有者**：灵动Code Desktop/Host。
- **ZCode 业务数据所有者**：ZCode。
- **默认灵动Code 业务数据根**：`<Electron appData>/灵动Code/data/.zcode`。
- **开发态默认业务数据根**：`<Electron appData>/灵动Code Dev/data/.zcode`，避免开发包覆盖安装包数据。
- **ZCode 业务数据根**：继续为 `${HOME}/.zcode`，灵动Code 不读取、不写入、不迁移。
- Electron 的 `userData` / `sessionData` 仅保存 Chromium 与桌面壳状态，不是任务、工作区或 Provider 数据所有者。

## 启动解析顺序

```text
显式 ZCODE_DATA_BASE_DIR
  > 灵动Code 独立数据根中的用户自定义 dataBaseDir
  > 灵动Code 产品默认数据根
  > Host / Agent 继承同一个解析结果
```

规则：

- `desktopEarlyDataBaseDirBootstrap` 必须在 Setting、Credential、Telemetry、Host 初始化前生效。
- 默认数据根必须位于应用专属 appData 目录，不能再回退到 `${HOME}`。
- `ZCODE_DESKTOP_APPLICATION_NAME` 继续作为测试隔离覆盖；显式 `ZCODE_DATA_BASE_DIR` 优先级更高。
- 用户设置的自定义 `dataBaseDir` 仍生效，且其配置文件从灵动Code 独立数据根读取。
- AICYLD 登录态只保存在灵动Code 独立数据根；升级到隔离版本后需要重新登录。
- 运行时同时设置 `ZCODE_DATA_BASE_DIR`、`ZCODE_STORAGE_DIR=<业务数据根>/.zcode` 与 `ZCODE_HOME=<业务数据根>/.zcode`，确保 Host、Worker、Agent、CLI、MCP、skills 和插件缓存不读取旧 ZCode 目录。
- 当 `ZCODE_STORAGE_DIR` 已设置时，Agent 用户配置文件固定解析为 `<ZCODE_STORAGE_DIR>/cli/config.json`；不得回退读取 `${HOME}/.zcode/cli/config.json`。
- 不自动导入 ZCode 的任务、工作区、Provider、MCP、插件或模型选择。

## 验收

- Windows 打包版默认业务数据根为 `%APPDATA%/灵动Code/data/.zcode`，不访问 `%USERPROFILE%/.zcode`。
- 开发态默认业务数据根为 `%APPDATA%/灵动Code Dev/data/.zcode`。
- 首次启动任务列表为空，不出现 ZCode 的工作区历史。
- 首次登录只创建 AICYLD Provider，不出现 BigModel、CC、dp、DeepSeek 等旧 Provider。
- Agent 启动后不加载旧 ZCode MCP；简单首轮对话不再携带第三方 MCP 工具定义。
- 旧 `${HOME}/.zcode/cli/config.json` 中存在第三方 MCP 时，灵动Code 首次请求不得加载这些 MCP。
- 显式 `ZCODE_DATA_BASE_DIR` 能完整覆盖默认业务数据根。
- 用户自定义 `dataBaseDir` 能继续迁移并生效。