import { InfoIcon, Loader2Icon } from "lucide-react";
import type { ProviderSettingsView } from "@zcode/services";
import { Button } from "@/components/ui/button.js";
import { ZCodeAppLogo } from "@/components/mobile-ui/ZCodeAppLogo.js";
import { useProviderSettingsView } from "@/hooks/useProviderSettingsView.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import {
  AICYLD_CODE_MODEL_ID,
  AICYLD_CODE_PROVIDER_TEMPLATE_ID,
} from "@/lib/aicyldBuiltinModel.js";

export type BuiltinModelStatus = "enabled" | "loginRequired" | "unavailable";

export function resolveBuiltinModelStatus(view: ProviderSettingsView | null): BuiltinModelStatus {
  if (!view) {
    return "unavailable";
  }
  const provider = view.providers.find(
    (candidate) => candidate.templateId === AICYLD_CODE_PROVIDER_TEMPLATE_ID,
  );
  if (!provider) {
    return "loginRequired";
  }
  const model = provider.models.find((candidate) => candidate.modelId === AICYLD_CODE_MODEL_ID);
  return provider.enabled && provider.executable && model?.selectable && model.enabled
    ? "enabled"
    : "unavailable";
}

export function LingdongBuiltinModelSection() {
  const { intl } = useZCodeIntl();
  const providerSettings = useProviderSettingsView();
  const view = providerSettings.state.status === "ready" ? providerSettings.state.view : null;

  if (providerSettings.state.status === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-border bg-card">
        <Loader2Icon className="size-4 animate-spin text-foreground-subtle" aria-hidden="true" />
        <span className="ml-2 text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "common.loading" })}
        </span>
      </div>
    );
  }

  if (providerSettings.state.status === "error") {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
        <p className="text-ui-base text-destructive">{providerSettings.state.error.message}</p>
        <Button type="button" variant="outline" onClick={providerSettings.reload}>
          {intl.formatMessage({ id: "common.retry" })}
        </Button>
      </div>
    );
  }

  const status = resolveBuiltinModelStatus(view);
  const statusLabel = intl.formatMessage({ id: `settings.modelProvider.builtin.${status}` });
  const statusClassName =
    status === "enabled"
      ? "bg-success/10 text-success"
      : status === "loginRequired"
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";

  return (
    <div className="space-y-4">
      <p className="text-ui-base leading-6 text-foreground-subtle">
        {intl.formatMessage({ id: "settings.modelProvider.builtin.description" })}
      </p>
      <section
        className="rounded-xl border border-border bg-card p-5"
        data-testid="lingdong-builtin-model-card"
      >
        <div className="flex flex-wrap items-start gap-3">
          <ZCodeAppLogo className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-ui-lg font-semibold text-foreground">
                {intl.formatMessage({ id: "settings.modelProvider.builtin.title" })}
              </h2>
              <span className="rounded-full bg-surface px-2 py-0.5 text-ui-xs font-medium text-foreground-subtle">
                {intl.formatMessage({ id: "settings.modelProvider.builtin.badge" })}
              </span>
            </div>
            <p className="mt-1 text-ui-sm leading-5 text-foreground-subtle">
              {intl.formatMessage({ id: "settings.modelProvider.builtin.description" })}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-ui-xs font-medium ${statusClassName}`}>
            {statusLabel}
          </span>
        </div>
      </section>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-ui-sm text-foreground-subtle">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{intl.formatMessage({ id: "settings.modelProvider.builtin.restricted" })}</p>
      </div>
    </div>
  );
}
