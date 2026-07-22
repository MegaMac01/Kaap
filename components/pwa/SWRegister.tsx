"use client";

import { useEffect } from "react";

/** Registers the service worker (production only: caching fights dev HMR). */
export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app works fine without offline support.
    });
  }, []);
  return null;
}
