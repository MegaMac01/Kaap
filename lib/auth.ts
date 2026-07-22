"use client";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface AuthResult {
  ok: boolean;
  message: string;
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: "Sign-in isn't set up yet: you can keep exploring as a guest.",
};

/**
 * Email magic link. Passes name/interests as signup metadata so the DB
 * trigger seeds the profile row for brand-new users.
 */
export async function signInWithEmail(
  email: string,
  meta: { name: string; interests: string[] }
): Promise<AuthResult> {
  const sb = getBrowserSupabase();
  if (!sb) return NOT_CONFIGURED;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: meta,
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your email for a sign-in link." };
}

/**
 * Permanently deletes the signed-in user's account (POPIA erasure). The
 * delete_account RPC removes the auth user, which cascades to profile + saves.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const sb = getBrowserSupabase();
  if (!sb) return NOT_CONFIGURED;
  const { error } = await sb.rpc("delete_account");
  if (error) return { ok: false, message: error.message };
  await sb.auth.signOut();
  return { ok: true, message: "Your account and data have been deleted." };
}

/** OAuth sign-in. Requires the provider to be enabled in Supabase Auth settings. */
export async function signInWithProvider(provider: "google" | "apple"): Promise<AuthResult> {
  const sb = getBrowserSupabase();
  if (!sb) return NOT_CONFIGURED;
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  // On success the browser navigates away; reaching here with no error just
  // means the redirect is in flight.
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Redirecting…" };
}
