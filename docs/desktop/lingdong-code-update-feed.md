# 灵动Code Stable 更新 Feed 规格

## 目标

为灵动Code Windows x64 内部版本提供稳定、可手工验证的更新 feed，同时保持正式自动更新在签名证书到位前关闭。

## 范围

- 通道：stable-only。
- 平台：Windows x64。
- 不包含 preview 灰度、macOS、Linux 和自动回滚。
- 未签名安装包只用于内部验收，不作为正式自动更新版本发布。

## 公开地址

```text
https://www.aicyld.com.cn/updates/lingdong-code/stable/windows-x64/latest.yml
```

同目录保存：

```text
灵动Code-<version>-win-x64.exe
灵动Code-<version>-win-x64.exe.blockmap
latest.yml
```

`latest.yml` 中的 `files[].url` 和 `path` 必须是完整 HTTPS URL，不能依赖客户端默认 origin 解析相对路径。

## 版本与构建

- 首个更新链路版本：`3.17.0`。
- 构建期默认 feed：

```text
ZCODE_UPDATE_FEED_URL=https://www.aicyld.com.cn/updates/lingdong-code/stable/windows-x64/latest.yml
```

- 客户端解析优先级：
  1. `--zcode-update-feed-url`
  2. 运行时 `ZCODE_UPDATE_FEED_URL`
  3. 构建期 `ZCODE_UPDATE_FEED_URL`
- 正式包在签名前必须保持 `ZCODE_AUTO_UPDATE` 关闭。
- 内部 updater 验证包可以单独启用 `ZCODE_AUTO_UPDATE=1`，但不得上传到正式 stable feed。

## 发布流程

1. 用根版本号构建 Windows x64 内部安装包。
2. 运行 feed 准备脚本：

```bash
pnpm prepare:lingdong-update-feed \
  --artifact-dir packages/desktop/dist-lingdong-internal-<stamp> \
  --output-dir packages/desktop/update-feed/stable/windows-x64 \
  --base-url https://www.aicyld.com.cn/updates/lingdong-code/stable/windows-x64
```

3. 校验脚本输出中的版本、安装包名和 manifest URL。
4. 将输出目录上传到生产 `/srv/aicyld/main-prod/public-updates/lingdong-code/stable/windows-x64/`。
5. 验证：

```text
GET /updates/lingdong-code/stable/windows-x64/latest.yml
HEAD /updates/lingdong-code/stable/windows-x64/<installer>
HEAD /updates/lingdong-code/stable/windows-x64/<installer>.blockmap
```

## 验收

1. `latest.yml` 版本与安装包版本一致。
2. `latest.yml` 中 URL 为绝对 HTTPS 地址。
3. 安装包与 blockmap 可通过公网地址访问。
4. 未签名正式包不检查、不下载、不安装更新。
5. 内部 updater 验证包安装后，下一次启动可读取该 manifest 并进入更新流程。
6. 获得签名证书后，重新构建签名稳定包，人工安装一次完成迁移，再验证后续自动更新。
