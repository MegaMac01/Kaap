"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKaap } from "@/lib/store";

/** First-run redirect: no local profile yet → onboarding. */
export function OnboardingGate() {
  const router = useRouter();
  const { hydrated, profile } = useKaap();

  useEffect(() => {
    if (hydrated && !profile) router.replace("/onboarding");
  }, [hydrated, profile, router]);

  return null;
}
