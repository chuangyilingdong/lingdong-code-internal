import { useCallback, useEffect, useRef, useState } from "react";
import type { AicyldPointsWallet } from "@zcode/shared";
import { useServices } from "../hooks/useServices.js";
import { logger } from "@/logger.js";

export function useAicyldWallet(userId: string | null | undefined) {
  const { oauthService } = useServices();
  const [wallet, setWallet] = useState<AicyldPointsWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWallet(null);
      setError(null);
      return;
    }
    const generation = ++requestGeneration.current;
    setLoading(true);
    try {
      const next = await oauthService.getAicyldWallet();
      if (generation !== requestGeneration.current) return;
      setWallet(next);
      setError(null);
    } catch (cause) {
      if (generation !== requestGeneration.current) return;
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      logger.warn("[AICYLD] 读取积分余额失败", { error: nextError });
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [oauthService, userId]);

  useEffect(() => {
    void refresh();
    if (!userId) return;
    const timer = window.setInterval(() => void refresh(), 15_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      requestGeneration.current += 1;
    };
  }, [refresh, userId]);

  return { wallet, loading, error, refresh };
}
