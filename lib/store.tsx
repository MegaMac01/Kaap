"use client";

import { useSyncExternalStore } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";

/**
 * Client store, auth-aware (SPEC §5.1):
 * - Guest mode: profile + saved spots persist to localStorage.
 * - Signed in: saves and profile live in Supabase (optimistic writes);
 *   on first sign-in, guest saves/profile migrate to the account.
 * Exposed via useSyncExternalStore so SSR and hydration stay consistent.
 */

const PROFILE_KEY = "kaap:profile";
const SAVED_KEY = "kaap:saved";

export interface AuthUser {
  id: string;
  email: string | null;
}

interface StoreState {
  /** False until localStorage has been read: gate redirects/hearts on this. */
  hydrated: boolean;
  profile: Profile | null;
  savedIds: string[];
  /** Header search query (drives Discover filtering). */
  query: string;
  /** Supabase user when signed in; null in guest mode. */
  user: AuthUser | null;
}

const INITIAL_STATE: StoreState = {
  hydrated: false,
  profile: null,
  savedIds: [],
  query: "",
  user: null,
};

let state: StoreState = INITIAL_STATE;
const listeners = new Set<() => void>();

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.): saves just won't persist.
  }
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

interface ProfileRow {
  name: string;
  interests: string[];
}

/**
 * Runs when a session appears: migrates any guest saves/profile into the
 * account, then loads the account's profile + saves as the source of truth.
 */
async function syncAccount(user: AuthUser) {
  const sb = getBrowserSupabase();
  if (!sb) return;

  const localProfile = readJson<Profile>(PROFILE_KEY);
  const localSaves = readJson<string[]>(SAVED_KEY) ?? [];

  // Migrate guest saves (SPEC §5.1: "on sign-in, migrate local saves").
  if (localSaves.length) {
    await sb
      .from("saves")
      .upsert(
        localSaves.map((spot_id) => ({ user_id: user.id, spot_id })),
        { onConflict: "user_id,spot_id", ignoreDuplicates: true }
      );
  }

  // Profile row is created by the signup trigger; upsert as belt-and-braces,
  // seeding from guest data without clobbering an existing name/interests.
  let { data: row } = await sb
    .from("profiles")
    .select("name, interests")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!row) {
    const inserted = await sb
      .from("profiles")
      .upsert({
        id: user.id,
        name: localProfile?.name ?? "",
        interests: localProfile?.interests ?? [],
      })
      .select("name, interests")
      .maybeSingle<ProfileRow>();
    row = inserted.data;
  } else if (!row.name && localProfile?.name) {
    const updated = await sb
      .from("profiles")
      .update({ name: localProfile.name, interests: localProfile.interests })
      .eq("id", user.id)
      .select("name, interests")
      .maybeSingle<ProfileRow>();
    row = updated.data ?? row;
  }

  const { data: saveRows } = await sb
    .from("saves")
    .select("spot_id")
    .order("created_at", { ascending: true });

  const profile: Profile = {
    name: row?.name ?? localProfile?.name ?? "",
    interests: row?.interests ?? localProfile?.interests ?? [],
    // Location consent stays on-device (POPIA, SPEC §11), never synced.
    located: localProfile?.located ?? false,
    coords: localProfile?.coords ?? null,
  };

  removeKey(SAVED_KEY); // migrated: the account is now the source of truth
  writeJson(PROFILE_KEY, profile);

  setState({
    user,
    profile,
    savedIds: saveRows?.map((r) => r.spot_id) ?? [],
    hydrated: true,
  });
}

let hydrationScheduled = false;
function ensureHydrated() {
  if (hydrationScheduled || typeof window === "undefined") return;
  hydrationScheduled = true;
  // Microtask so the store never emits during a component render.
  queueMicrotask(() => {
    setState({
      profile: readJson<Profile>(PROFILE_KEY),
      savedIds: readJson<string[]>(SAVED_KEY) ?? [],
      hydrated: true,
    });

    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.auth.onAuthStateChange((_event, session) => {
      // Deferred: supabase-js warns against awaiting inside this callback.
      queueMicrotask(() => {
        const u = session?.user;
        if (u && state.user?.id !== u.id) {
          void syncAccount({ id: u.id, email: u.email ?? null });
        } else if (!u && state.user) {
          setState({ user: null, savedIds: [] });
        }
      });
    });
  });
}

function subscribe(cb: () => void) {
  ensureHydrated();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL_STATE;

export function saveProfile(p: Profile) {
  writeJson(PROFILE_KEY, p);
  setState({ profile: p });
  const sb = getBrowserSupabase();
  if (sb && state.user) {
    void sb
      .from("profiles")
      .update({ name: p.name, interests: p.interests, updated_at: new Date().toISOString() })
      .eq("id", state.user.id);
  }
}

export function signOut() {
  const sb = getBrowserSupabase();
  if (sb && state.user) void sb.auth.signOut();
  removeKey(PROFILE_KEY);
  removeKey(SAVED_KEY);
  setState({ profile: null, savedIds: [], query: "", user: null });
}

export function toggleSaved(id: string) {
  const prev = state.savedIds;
  const adding = !prev.includes(id);
  const next = adding ? [...prev, id] : prev.filter((x) => x !== id);
  setState({ savedIds: next });

  const sb = getBrowserSupabase();
  if (sb && state.user) {
    const uid = state.user.id;
    const op = adding
      ? sb.from("saves").insert({ user_id: uid, spot_id: id })
      : sb.from("saves").delete().eq("user_id", uid).eq("spot_id", id);
    void op.then(({ error }) => {
      if (error) setState({ savedIds: prev }); // revert optimistic update
    });
  } else {
    writeJson(SAVED_KEY, next);
  }
}

export function setQuery(query: string) {
  setState({ query });
}

export interface KaapStore extends StoreState {
  saveProfile: (p: Profile) => void;
  signOut: () => void;
  toggleSaved: (id: string) => void;
  setQuery: (q: string) => void;
  isSaved: (id: string) => boolean;
  savedCount: number;
}

export function useKaap(): KaapStore {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...s,
    saveProfile,
    signOut,
    toggleSaved,
    setQuery,
    isSaved: (id) => s.savedIds.includes(id),
    savedCount: s.savedIds.length,
  };
}
