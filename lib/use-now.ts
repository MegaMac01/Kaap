"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Current time, hydration-safe: null on the server and during hydration, then
 * ticking every `intervalMs`. Open-now badges render neutrally until it
 * resolves, avoiding SSR/client mismatches.
 */
export function useNow(intervalMs = 30_000): Date | null {
  const tick = useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, intervalMs);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / intervalMs),
    () => null
  );
  return useMemo(() => (tick === null ? null : new Date()), [tick]);
}
