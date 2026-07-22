import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client, or null when the env vars aren't set: the app
 * then runs on the bundled seed data. Set NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example) to go live.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
