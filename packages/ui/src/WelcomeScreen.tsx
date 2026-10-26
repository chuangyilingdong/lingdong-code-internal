import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2Icon, PhoneIcon, ShieldCheckIcon } from "lucide-react";
import { AICYLD_PROVIDER_ID, type OAuthProviderId, type OAuthProviderMeta } from "@zcode/shared";
import { Alert, AlertDescription } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { DesktopOverlayWindowControls } from "@/DesktopOverlayWindowControls.js";
import { ZCodeAppLogo } from "@/components/mobile-ui/ZCodeAppLogo.js";
import { useZCodeIntl } from "./i18n/IntlProvider.js";
import { ThemeHeroVisual } from "./openWorkspacePageThemeHero.js";
import { usePlatform } from "./hooks/usePlatform.js";
import { useServices } from "./hooks/useServices.js";
import { useZCodeStore } from "./store/StoreProvider.js";

const AICYLD_REGISTER_URL = "https://www.aicyld.com.cn/register";

interface WelcomeScreenProps {
  onComplete: (reason: LoginCompleteReason) => void | Promise<void>;
}

export type LoginCompleteReason = "oauth" | "apiKey" | "skip";

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  return (
    <main className="relative flex h-full min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6">
      <ThemeHeroVisual className="absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 right-0 z-10 flex h-12 items-center [app-region:drag] platform-windows-desktop:right-[134px] platform-linux-desktop:right-[134px]" />
      <DesktopOverlayWindowControls />
      <section className="relative z-10 flex w-full max-w-sm flex-col gap-7 rounded-2xl border border-popover-border bg-background p-8 text-ui-base/relaxed shadow-md sm:p-10">
        <LoginPanel active onComplete={onComplete} />
      </section>
    </main>
  );
}

interface LoginPanelProps {
  active: boolean;
  onComplete: (reason: LoginCompleteReason) => void | Promise<void>;
}

export function LoginPanel({ active, onComplete }: LoginPanelProps) {
  const { intl } = useZCodeIntl();
  const platform = usePlatform();
  const services = useServices();
  const setUser = useZCodeStore((state) => state.setUser);
  const markOAuthSuccess = useZCodeStore((state) => state.markOAuthSuccess);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = useMemo(() => /^1[3-9]\d{9}$/u.test(phone.trim()), [phone]);

  useEffect(() => {
    if (!active || cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active, cooldown]);

  const sendCode = async () => {
    if (!phoneValid || sending || cooldown > 0) return;
    setSending(true);
    setError(null);
    try {
      const result = await services.oauthService.sendAicyldSms(phone.trim());
      setCooldown(result.cooldown);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : intl.formatMessage({ id: "login.aicyld.sendFailed" }));
    } finally {
      setSending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phoneValid || !code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await services.oauthService.loginAicyldWithSms(phone.trim(), code.trim());
      setUser(user);
      markOAuthSuccess(AICYLD_PROVIDER_ID);
      await services.providerSettingsService.refresh("aicyld-login").catch(() => undefined);
      await onComplete("oauth");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : intl.formatMessage({ id: "login.aicyld.loginFailed" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="flex flex-col items-center gap-3 text-center">
        <ZCodeAppLogo className="mb-1 size-16" />
        <h1 className="text-3xl font-semibold tracking-tight">{intl.formatMessage({ id: "login.aicyld.title" })}</h1>
      </header>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className="flex flex-col gap-2">
          <span className="text-ui-sm font-medium text-foreground-subtle">{intl.formatMessage({ id: "login.aicyld.phone" })}</span>
          <div className="relative">
            <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtlest" />
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/gu, "").slice(0, 11))}
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              placeholder={intl.formatMessage({ id: "login.aicyld.phonePlaceholder" })}
              className="h-10 pl-9 text-ui-base"
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-ui-sm font-medium text-foreground-subtle">{intl.formatMessage({ id: "login.aicyld.code" })}</span>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <ShieldCheckIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtlest" />
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={intl.formatMessage({ id: "login.aicyld.codePlaceholder" })}
                className="h-10 pl-9 text-ui-base"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 px-3 text-ui-sm"
              disabled={!phoneValid || sending || cooldown > 0}
              onClick={() => void sendCode()}
            >
              {sending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {cooldown > 0
                ? intl.formatMessage({ id: "login.aicyld.resendIn" }, { seconds: String(cooldown) })
                : intl.formatMessage({ id: "login.aicyld.sendCode" })}
            </Button>
          </div>
        </label>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          className="h-10 w-full text-ui-base"
          disabled={!phoneValid || !code.trim() || submitting}
        >
          {submitting ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
          {submitting ? intl.formatMessage({ id: "login.aicyld.loggingIn" }) : intl.formatMessage({ id: "login.aicyld.login" })}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 text-center text-ui-sm text-foreground-subtle">
        <p>{intl.formatMessage({ id: "login.aicyld.accountHint" })}</p>
        <button
          type="button"
          className="font-medium text-brand hover:underline"
          onClick={() => platform.openExternal(AICYLD_REGISTER_URL)}
        >
          {intl.formatMessage({ id: "login.aicyld.register" })}
        </button>
      </div>
    </>
  );
}

export function resolveVisibleLoginProviders(providers: OAuthProviderMeta[]): OAuthProviderMeta[] {
  return providers.filter((provider) => provider.id === AICYLD_PROVIDER_ID);
}

export function resolveLoginRetryProvider({
  providers,
}: {
  pendingProvider: OAuthProviderId | null;
  lastAttemptProvider: OAuthProviderId | null;
  providers: OAuthProviderMeta[];
}): OAuthProviderId | null {
  return providers.some((provider) => provider.id === AICYLD_PROVIDER_ID) ? AICYLD_PROVIDER_ID : null;
}
