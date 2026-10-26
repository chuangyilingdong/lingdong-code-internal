import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";
import { setDataBaseDir } from "@zcode/services/node";

const LINGDONG_CODE_APPLICATION_DIR_NAME = "灵动Code";
const LINGDONG_CODE_DEV_APPLICATION_DIR_NAME = "灵动Code Dev";
const LINGDONG_CODE_BUSINESS_DATA_DIR_NAME = "data";

export interface DesktopBusinessDataBaseDirOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  isPackaged?: boolean;
}

export function resolveDesktopBusinessDataApplicationName(
  options: Pick<DesktopBusinessDataBaseDirOptions, "env" | "isPackaged"> = {},
): string {
  const override = options.env?.ZCODE_DESKTOP_APPLICATION_NAME?.trim();
  if (override) {
    return override;
  }
  return options.isPackaged === false
    ? LINGDONG_CODE_DEV_APPLICATION_DIR_NAME
    : LINGDONG_CODE_APPLICATION_DIR_NAME;
}

export function resolveDesktopBusinessDataBaseDir(
  options: DesktopBusinessDataBaseDirOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const home = options.homeDir ?? homedir();
  const desktopHomeOverride = env.ZCODE_DESKTOP_HOME_DIR?.trim();
  if (desktopHomeOverride) {
    return desktopHomeOverride;
  }
  const applicationName = resolveDesktopBusinessDataApplicationName(options);

  if (platform === "win32") {
    const appData = env.APPDATA?.trim() || win32.join(home, "AppData", "Roaming");
    return win32.join(appData, applicationName, LINGDONG_CODE_BUSINESS_DATA_DIR_NAME);
  }
  if (platform === "darwin") {
    return posix.join(
      home,
      "Library",
      "Application Support",
      applicationName,
      LINGDONG_CODE_BUSINESS_DATA_DIR_NAME,
    );
  }
  const appData = env.XDG_CONFIG_HOME?.trim() || posix.join(home, ".config");
  return posix.join(appData, applicationName, LINGDONG_CODE_BUSINESS_DATA_DIR_NAME);
}

export function resolveDesktopZCodeHomeDir(dataBaseDir: string): string {
  return join(dataBaseDir, ".zcode");
}

export function resolveBootstrapSettingsFile(dataBaseDir: string = homedir()): string {
  return join(dataBaseDir, ".zcode", "v2", "setting.json");
}

export function extractBootstrapDataBaseDir(rawValue: unknown): string | null {
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }

  const dataBaseDir = (rawValue as { dataBaseDir?: unknown }).dataBaseDir;
  if (typeof dataBaseDir !== "string") {
    return null;
  }

  const trimmed = dataBaseDir.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBootstrapDataBaseDirFromDisk(settingsFile: string): string | null {
  if (!existsSync(settingsFile)) {
    return null;
  }

  try {
    const raw = readFileSync(settingsFile, "utf-8");
    return extractBootstrapDataBaseDir(JSON.parse(raw));
  } catch {
    return null;
  }
}

function resolveDefaultIsPackaged(): boolean {
  return (process as NodeJS.Process & { defaultApp?: boolean }).defaultApp !== true;
}

export function applyEarlyDataBaseDirBootstrap(
  options: DesktopBusinessDataBaseDirOptions = {},
): string {
  const env = options.env ?? process.env;
  const shouldUpdateProcessEnv = options.env === undefined || options.env === process.env;
  const applyResolvedDataBaseDir = (dataBaseDir: string) => {
    setDataBaseDir(dataBaseDir);
    if (shouldUpdateProcessEnv) {
      // Worker 线程和 Agent 子进程不会继承 setDataBaseDir() 的模块内状态，只继承进程环境。
      process.env.ZCODE_DATA_BASE_DIR = dataBaseDir;
      // Agent CLI 的 config/MCP/插件根使用 ZCODE_STORAGE_DIR；ZCODE_HOME 继续供 CUA/telemetry 使用。
      const zcodeHomeDir = resolveDesktopZCodeHomeDir(dataBaseDir);
      process.env.ZCODE_HOME = zcodeHomeDir;
      process.env.ZCODE_STORAGE_DIR = zcodeHomeDir;
    }
  };

  const explicitDataBaseDir = env.ZCODE_DATA_BASE_DIR?.trim();
  if (explicitDataBaseDir) {
    applyResolvedDataBaseDir(explicitDataBaseDir);
    return explicitDataBaseDir;
  }

  const productDataBaseDir = resolveDesktopBusinessDataBaseDir({
    ...options,
    env,
    isPackaged: options.isPackaged ?? resolveDefaultIsPackaged(),
  });
  applyResolvedDataBaseDir(productDataBaseDir);

  const customDataBaseDir = readBootstrapDataBaseDirFromDisk(
    resolveBootstrapSettingsFile(productDataBaseDir),
  );
  if (customDataBaseDir) {
    // 自定义业务数据目录仍属于灵动Code，只是换到用户选择的位置；不得回退读取 ZCode 的 ~/.zcode。
    applyResolvedDataBaseDir(customDataBaseDir);
    return customDataBaseDir;
  }
  return productDataBaseDir;
}
