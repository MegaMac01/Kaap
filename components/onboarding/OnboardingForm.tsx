"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, Check, Mail } from "lucide-react";
import { signInWithEmail, signInWithProvider, type AuthResult } from "@/lib/auth";
import { INTERESTS } from "@/lib/data/spots";
import { useKaap } from "@/lib/store";
import type { Profile } from "@/lib/types";

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveProfile } = useKaap();
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [located, setLocated] = useState(false);
  const [coords, setCoords] = useState<Profile["coords"]>(null);
  const [email, setEmail] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthResult | null>(
    searchParams.get("auth_error")
      ? { ok: false, message: "That sign-in link didn't work: request a fresh one below." }
      : null
  );
  const [sending, setSending] = useState(false);

  const toggleInterest = (key: string) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    // POPIA (SPEC §11): location is requested just-in-time, used only to sort
    // by distance, and kept on-device, never sent to a server.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocated(true);
      },
      () => setLocated(false)
    );
  };

  const persistProfile = () => saveProfile({ name: name.trim(), interests, located, coords });

  const start = () => {
    persistProfile();
    router.push("/");
  };

  const emailSignIn = async () => {
    if (!email.trim() || sending) return;
    // Keep the guest profile so it migrates into the account on first sign-in.
    persistProfile();
    setSending(true);
    setAuthStatus(await signInWithEmail(email.trim(), { name: name.trim(), interests }));
    setSending(false);
  };

  const oauthSignIn = async (provider: "google") => {
    persistProfile();
    setAuthStatus(await signInWithProvider(provider));
  };

  return (
    <div className="flex min-h-screen items-stretch">
      {/* Decorative panel: desktop only (≥900px) */}
      <div
        className="relative hidden flex-[1.1] overflow-hidden min-[900px]:block"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg,#3f7d5c 0 14px,#2c5a41 14px 28px)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(23,40,31,0.1)] to-[rgba(23,40,31,0.55)]" />
        <div className="absolute bottom-11 left-11 right-11 text-[#f3ecdc]">
          <div className="font-display text-[52px] italic leading-none">
            Everything worth
            <br />
            doing in the Cape.
          </div>
          <div className="mt-[14px] max-w-[360px] text-[15px] opacity-85">
            From the famous spots to the lowkey ones locals keep quiet, mapped, priced and ready
            when you are.
          </div>
          {/* TODO: real hero photo (SPEC §7) */}
          <div className="mt-[22px] font-mono text-[11px] opacity-60">
            photo: Table Mountain from Bloubergstrand
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-7 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-7 flex items-baseline gap-[9px]">
            <span className="inline-block size-[11px] rounded-full bg-terracotta" />
            <span className="font-display text-[26px]">Kaap</span>
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">
              Cape Town
            </span>
          </div>

          <h1 className="mb-[6px] font-display text-[34px] font-normal leading-[1.05]">
            Let&rsquo;s set you up
          </h1>
          <p className="mb-6 text-[14.5px] text-muted">
            Two quick things and we&rsquo;ll tune the map to you. Free, takes a second.
          </p>

          <label
            htmlFor="ob-name"
            className="mb-[7px] block text-[12px] font-bold uppercase tracking-[0.6px] text-muted2"
          >
            Your name
          </label>
          <input
            id="ob-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Thandi"
            className="mb-[22px] w-full rounded-[12px] border border-forest/20 bg-card px-[15px] py-[13px] text-[15px] outline-none"
          />

          <div className="mb-[9px] block text-[12px] font-bold uppercase tracking-[0.6px] text-muted2">
            What are you into?
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = interests.includes(i.key);
              return (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => toggleInterest(i.key)}
                  aria-pressed={on}
                  className={`cursor-pointer rounded-full border px-[15px] py-[9px] text-[13.5px] font-semibold ${
                    on
                      ? "border-forest bg-forest text-white"
                      : "border-forest/20 bg-card text-ink-soft"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={locate}
            className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-forest/30 bg-card p-3 text-[14px] font-semibold text-forest"
          >
            {located ? <Check size={15} /> : <LocateFixed size={15} />}
            {located ? "Using your location" : "Use my current location"}
          </button>

          <button
            type="button"
            onClick={start}
            className="mb-[14px] w-full cursor-pointer rounded-[12px] border-none bg-forest p-[14px] text-[15px] font-bold text-white"
          >
            Start exploring →
          </button>

          <div className="mb-[14px] mt-[6px] flex items-center gap-2">
            <div className="h-px flex-1 bg-forest/15" />
            <span className="text-[12px] text-muted2">or sign in to sync your lists</span>
            <div className="h-px flex-1 bg-forest/15" />
          </div>

          <div className="mb-[10px] flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && emailSignIn()}
              placeholder="you@example.com"
              aria-label="Email address for a sign-in link"
              className="min-w-0 flex-1 rounded-[12px] border border-forest/20 bg-card px-[15px] py-[11px] text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={emailSignIn}
              disabled={sending}
              className="flex cursor-pointer items-center gap-[6px] rounded-[12px] border border-forest/20 bg-card px-[14px] text-[13.5px] font-semibold text-forest disabled:opacity-60"
            >
              <Mail size={14} /> {sending ? "Sending…" : "Send link"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => oauthSignIn("google")}
            className="w-full cursor-pointer rounded-[12px] border border-forest/20 bg-card p-[11px] text-[13.5px] font-semibold"
          >
            Google
          </button>

          {authStatus && (
            <p
              role="status"
              className={`mt-3 text-[13px] font-semibold ${authStatus.ok ? "text-open" : "text-closed"}`}
            >
              {authStatus.message}
            </p>
          )}

          <p className="mt-[18px] text-[11.5px] leading-[1.5] text-muted3">
            By continuing you agree to our{" "}
            <a href="/terms" className="underline">
              Terms
            </a>{" "}
            &amp;{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            . We follow POPIA: your location is only used to sort spots and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
