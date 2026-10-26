import type { MenuItemConstructorOptions } from "electron";
import { DesktopCommandIds, type Locale } from "@zcode/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  template: [] as MenuItemConstructorOptions[],
  tooltip: "",
}));

vi.mock("electron", () => ({
  app: { isPackaged: false },
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      captured.template = template;
      return { template };
    },
  },
  Tray: class {
    setToolTip(value: string) {
      captured.tooltip = value;
    }
    setContextMenu() {}
    on() {}
  },
}));

describe("desktop tray log export", () => {
  beforeEach(() => {
    vi.resetModules();
    captured.template = [];
    captured.tooltip = "";
  });

  it.each(["win32", "linux"] as const)(
    "%s replaces data deletion with localized log export and waits for the window",
    async (platform) => {
      const { createDesktopTray, updateWindowsDesktopTrayMenu } =
        await import("@desktop/main/desktopTray.js");
      let locale: Locale = "zh-CN";
      const windowReady = Promise.withResolvers<void>();
      const showCurrentWindow = vi.fn(() => windowReady.promise);
      const executeDesktopCommand = vi.fn(async () => undefined);
      createDesktopTray({
        platform,
        getLocale: () => locale,
        showCurrentWindow,
        executeDesktopCommand,
        quitApp: vi.fn(),
        logger: { warn: vi.fn() },
      });

      const labels = () => captured.template.map((item) => item.label).filter(Boolean);
      expect(labels()[0]).toBe("打开灵动Code");
      expect(captured.tooltip).toBe("灵动Code");
      expect(labels()).not.toContain("清除所有数据");
      expect(labels().slice(-3)).toEqual(["关于灵动Code", "导出日志", "退出"]);
      locale = "en-US";
      updateWindowsDesktopTrayMenu();
      expect(labels()[0]).toBe("Open Lingdong Code");
      expect(captured.tooltip).toBe("Lingdong Code");
      expect(labels()).not.toContain("Clear all data");
      expect(labels().slice(-3)).toEqual(["About Lingdong Code", "Export logs", "Quit"]);

      const item = captured.template.find((entry) => entry.label === "Export logs");
      expect(item?.click).toBeDefined();
      // 模板回调不读取 Electron 事件参数；直接触发同一个原生菜单动作。
      (item!.click as () => void)();
      expect(showCurrentWindow).toHaveBeenCalledExactlyOnceWith();
      expect(executeDesktopCommand).not.toHaveBeenCalled();
      windowReady.resolve();
      await vi.waitFor(() =>
        expect(executeDesktopCommand).toHaveBeenCalledExactlyOnceWith(DesktopCommandIds.ExportLogs),
      );
    },
  );
});
