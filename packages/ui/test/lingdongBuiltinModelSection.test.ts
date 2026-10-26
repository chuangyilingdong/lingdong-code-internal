import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ProviderSettingsView } from "@zcode/services";
import {
  LingdongBuiltinModelSection,
  resolveBuiltinModelStatus,
} from "../src/settings/LingdongBuiltinModelSection.js";

const hookState = vi.hoisted(() => ({
  useProviderSettingsView: vi.fn(),
}));

vi.mock("../src/hooks/useProviderSettingsView.js", () => ({
  useProviderSettingsView: hookState.useProviderSettingsView,
}));

vi.mock("../src/i18n/IntlProvider.js", () => ({
  useZCodeIntl: () => ({
    intl: {
      formatMessage: ({ id }: { id: string }) => id,
    },
  }),
}));

function createView(overrides: { providerEnabled?: boolean; executable?: boolean } = {}) {
  return {
    revision: 1,
    providerTemplates: [],
    providerOrder: ["aicyld-code"],
    providers: [
      {
        providerId: "aicyld-code",
        templateId: "aicyld-code",
        providerName: "AICYLD 灵动 Code",
        enabled: overrides.providerEnabled ?? true,
        executable: overrides.executable ?? true,
        effectiveConfig: {},
        issues: [],
        models: [
          {
            modelId: "lingdong-code",
            enabled: true,
            selectable: true,
            effectiveConfig: {},
            issues: [],
          },
        ],
      },
    ],
  } as unknown as ProviderSettingsView;
}

describe("LingdongBuiltinModelSection", () => {
  it("未登录或 Provider 不存在时提示登录后启用", () => {
    expect(resolveBuiltinModelStatus(null)).toBe("unavailable");
    expect(
      resolveBuiltinModelStatus({
        revision: 1,
        providerTemplates: [],
        providerOrder: [],
        providers: [],
      }),
    ).toBe("loginRequired");
  });

  it("仅当内置 Provider 和模型都可执行时显示已启用", () => {
    expect(resolveBuiltinModelStatus(createView())).toBe("enabled");
    expect(resolveBuiltinModelStatus(createView({ providerEnabled: false }))).toBe("unavailable");
    expect(resolveBuiltinModelStatus(createView({ executable: false }))).toBe("unavailable");
  });
  it("固定展示内置模型且不渲染自定义供应商编辑入口", () => {
    hookState.useProviderSettingsView.mockReturnValue({
      state: { status: "ready", view: createView() },
      reload: vi.fn(),
    });

    const html = renderToStaticMarkup(createElement(LingdongBuiltinModelSection));

    expect(html).toContain("settings.modelProvider.builtin.title");
    expect(html).toContain("settings.modelProvider.builtin.restricted");
    expect(html).not.toContain("settings.modelProvider.add");
    expect(html).not.toContain("settings.modelProvider.baseUrl");
    expect(html).not.toContain("settings.modelProvider.apiKey");
    expect(html).not.toContain("settings.modelProvider.models");
  });
});
