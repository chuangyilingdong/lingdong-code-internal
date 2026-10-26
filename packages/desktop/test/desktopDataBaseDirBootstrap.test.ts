import { posix, win32 } from "node:path";
import { describe, expect, it, vi } from "vitest";

const setDataBaseDirMock = vi.hoisted(() => vi.fn());

vi.mock("@zcode/services/node", () => ({
  setDataBaseDir: setDataBaseDirMock,
}));

import {
  applyEarlyDataBaseDirBootstrap,
  extractBootstrapDataBaseDir,
  resolveBootstrapSettingsFile,
  resolveDesktopZCodeHomeDir,
  resolveDesktopBusinessDataBaseDir,
} from "../src/main/desktopDataBaseDirBootstrap.js";

describe("desktopDataBaseDirBootstrap", () => {
  it("应从 bootstrap setting 中提取并裁剪 dataBaseDir", () => {
    expect(
      extractBootstrapDataBaseDir({
        dataBaseDir: "  /tmp/zcode-data  ",
      }),
    ).toBe("/tmp/zcode-data");
  });

  it("应忽略无效的 bootstrap 配置", () => {
    expect(extractBootstrapDataBaseDir(null)).toBeNull();
    expect(extractBootstrapDataBaseDir({ dataBaseDir: "" })).toBeNull();
    expect(extractBootstrapDataBaseDir({ dataBaseDir: 123 })).toBeNull();
  });

  it("应拼出 bootstrap setting 路径", () => {
    const result = resolveBootstrapSettingsFile("/Users/tester");
    // Windows 下 path.join 使用反斜杠，统一为正斜杠后再比较
    expect(result.replace(/\\/g, "/")).toBe("/Users/tester/.zcode/v2/setting.json");
  });

  it("ZCODE_HOME 指向独立业务数据根下的 .zcode", () => {
    expect(resolveDesktopZCodeHomeDir("/tmp/lingdong-data").replace(/\\/g, "/")).toBe(
      "/tmp/lingdong-data/.zcode",
    );
  });

  it("Windows 打包态默认使用灵动Code独立业务数据根", () => {
    const result = resolveDesktopBusinessDataBaseDir({
      platform: "win32",
      env: { APPDATA: "C:\\Users\\tester\\AppData\\Roaming" },
      homeDir: "C:\\Users\\tester",
      isPackaged: true,
    });
    expect(result).toBe(win32.join("C:\\Users\\tester\\AppData\\Roaming", "灵动Code", "data"));
  });

  it("Windows 开发态使用独立开发数据根", () => {
    const result = resolveDesktopBusinessDataBaseDir({
      platform: "win32",
      env: { APPDATA: "C:\\Users\\tester\\AppData\\Roaming" },
      homeDir: "C:\\Users\\tester",
      isPackaged: false,
    });
    expect(result).toBe(win32.join("C:\\Users\\tester\\AppData\\Roaming", "灵动Code Dev", "data"));
  });

  it("macOS 和 Linux 使用各自应用数据目录", () => {
    expect(
      resolveDesktopBusinessDataBaseDir({
        platform: "darwin",
        env: {},
        homeDir: "/Users/tester",
        isPackaged: true,
      }),
    ).toBe(posix.join("/Users/tester", "Library", "Application Support", "灵动Code", "data"));
    expect(
      resolveDesktopBusinessDataBaseDir({
        platform: "linux",
        env: { XDG_CONFIG_HOME: "/home/tester/.config" },
        homeDir: "/home/tester",
        isPackaged: true,
      }),
    ).toBe(posix.join("/home/tester/.config", "灵动Code", "data"));
  });

  it("桌面 home 测试隔离覆盖直接作为业务数据根", () => {
    expect(
      resolveDesktopBusinessDataBaseDir({
        platform: "win32",
        env: {
          APPDATA: "C:\\Users\\tester\\AppData\\Roaming",
          ZCODE_DESKTOP_HOME_DIR: "D:\\e2e-home",
        },
        homeDir: "C:\\Users\\tester",
        isPackaged: true,
      }),
    ).toBe("D:\\e2e-home");
  });

  it("显式 ZCODE_DATA_BASE_DIR 优先于产品默认数据根", () => {
    const result = applyEarlyDataBaseDirBootstrap({
      platform: "win32",
      env: {
        APPDATA: "C:\\Users\\tester\\AppData\\Roaming",
        ZCODE_DATA_BASE_DIR: "  D:\\isolated-lingdong-data  ",
      },
      homeDir: "C:\\Users\\tester",
      isPackaged: true,
    });

    expect(result).toBe("D:\\isolated-lingdong-data");
    expect(setDataBaseDirMock).toHaveBeenLastCalledWith("D:\\isolated-lingdong-data");
  });
  it("早期 bootstrap 同时向 Worker/Agent 传播 Data、Storage 与 Home 路径", () => {
    const originalDataBaseDir = process.env.ZCODE_DATA_BASE_DIR;
    const originalZCodeHome = process.env.ZCODE_HOME;
    const originalZCodeStorageDir = process.env.ZCODE_STORAGE_DIR;
    try {
      process.env.ZCODE_DATA_BASE_DIR = "/tmp/lingdong-worker-data";
      process.env.ZCODE_HOME = "/tmp/zcode-old-home/.zcode";
      process.env.ZCODE_STORAGE_DIR = "/tmp/zcode-old-home/.zcode";
      applyEarlyDataBaseDirBootstrap({ env: process.env });
      expect(process.env.ZCODE_DATA_BASE_DIR).toBe("/tmp/lingdong-worker-data");
      expect(process.env.ZCODE_HOME).toBe(resolveDesktopZCodeHomeDir("/tmp/lingdong-worker-data"));
      expect(process.env.ZCODE_STORAGE_DIR).toBe(
        resolveDesktopZCodeHomeDir("/tmp/lingdong-worker-data"),
      );
    } finally {
      if (originalDataBaseDir === undefined) delete process.env.ZCODE_DATA_BASE_DIR;
      else process.env.ZCODE_DATA_BASE_DIR = originalDataBaseDir;
      if (originalZCodeHome === undefined) delete process.env.ZCODE_HOME;
      else process.env.ZCODE_HOME = originalZCodeHome;
      if (originalZCodeStorageDir === undefined) delete process.env.ZCODE_STORAGE_DIR;
      else process.env.ZCODE_STORAGE_DIR = originalZCodeStorageDir;
    }
  });
});
