import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RootStartupLoading, ZCodeStartupLogoBadge } from "@/root/RootStartupLoading.js";

describe("RootStartupLoading", () => {
  it("静态品牌图标使用灵动Code资产且不渲染呼吸动画", () => {
    const html = renderToStaticMarkup(createElement(ZCodeStartupLogoBadge, { animated: false }));
    expect(html).toContain("<img");
    expect(html).toContain('data-app-logo="lingdong-code"');
    expect(html).not.toContain("animate-pulse");
  });
  it("启动阻塞态使用灵动Code Logo 呼吸动画而不是可见 loading 文案", () => {
    const html = renderToStaticMarkup(createElement(RootStartupLoading, { label: "加载中..." }));

    expect(html).toContain('data-testid="root-startup-loading"');
    expect(html).toContain('aria-label="加载中..."');
    expect(html).toContain('data-app-logo="lingdong-code"');
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain(">加载中...<");
  });
});
