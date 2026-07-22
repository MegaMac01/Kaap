/**
 * Smoke test against a running Supabase stack (local: `npx supabase start`).
 * Exercises the real P2 behavior: public spot reads, signup → profile trigger,
 * saves CRUD + guest-migration upsert, RLS isolation, magic-link email.
 *
 * Run: npx tsx scripts/smoke-db.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const stamp = Date.now();
  const anon = createClient(URL_, ANON);

  // 1. Public catalogue reads
  const { data: spots, error: spotsErr } = await anon.from("spots").select("id, name");
  check("anon can read spots", !spotsErr && (spots?.length ?? 0) === 23, `${spots?.length} rows`);
  const { data: cols } = await anon.from("collections").select("key");
  check("anon can read collections", (cols?.length ?? 0) === 6, `${cols?.length} rows`);

  // 2. Sign up user A with onboarding metadata → trigger seeds profile
  const a = createClient(URL_, ANON);
  const emailA = `thandi.${stamp}@example.com`;
  const { data: signA, error: signAErr } = await a.auth.signUp({
    email: emailA,
    password: "kaap-smoke-test-1",
    options: { data: { name: "Thandi Test", interests: ["eat", "outdoor"] } },
  });
  check("user A signup returns session", !signAErr && !!signA.session, signAErr?.message);
  const uidA = signA.user?.id ?? "";

  const { data: profA } = await a
    .from("profiles")
    .select("name, interests")
    .eq("id", uidA)
    .maybeSingle();
  check(
    "signup trigger created profile with metadata",
    profA?.name === "Thandi Test" && JSON.stringify(profA?.interests) === '["eat","outdoor"]',
    JSON.stringify(profA)
  );

  // 3. Saves CRUD + guest-migration style upsert
  await a.from("saves").insert({ user_id: uidA, spot_id: "truth" });
  const { error: upsertErr } = await a.from("saves").upsert(
    [
      { user_id: uidA, spot_id: "truth" }, // duplicate, must be ignored
      { user_id: uidA, spot_id: "lionshead" },
    ],
    { onConflict: "user_id,spot_id", ignoreDuplicates: true }
  );
  const { data: savesA } = await a.from("saves").select("spot_id").order("created_at");
  check(
    "saves insert + migration upsert dedupes",
    !upsertErr && savesA?.length === 2,
    JSON.stringify(savesA?.map((s) => s.spot_id))
  );

  const { error: delErr } = await a
    .from("saves")
    .delete()
    .eq("user_id", uidA)
    .eq("spot_id", "truth");
  const { data: savesA2 } = await a.from("saves").select("spot_id");
  check("unsave deletes row", !delErr && savesA2?.length === 1);

  // 4. RLS isolation: user B sees nothing of A's, can't write as A
  const b = createClient(URL_, ANON);
  const { data: signB } = await b.auth.signUp({
    email: `sipho.${stamp}@example.com`,
    password: "kaap-smoke-test-2",
  });
  const { data: bReadsA } = await b.from("saves").select("spot_id");
  check("user B cannot read A's saves", bReadsA?.length === 0, `${bReadsA?.length} rows`);
  const { error: bWritesA } = await b
    .from("saves")
    .insert({ user_id: uidA, spot_id: "zeitz" });
  check("user B cannot insert saves as A", !!bWritesA, bWritesA?.code);
  const { data: bReadsProfA } = await b.from("profiles").select("name").eq("id", uidA);
  check("user B cannot read A's profile", bReadsProfA?.length === 0);
  check("signB cleanup handle", !!signB.user); // keep tsc happy about usage

  // 5. Signed-out client sees no private data
  const { data: anonSaves } = await anon.from("saves").select("spot_id");
  check("anon cannot read saves", (anonSaves?.length ?? 0) === 0);

  // 6. Magic link: OTP email actually lands in the (local) inbox
  const emailC = `lerato.${stamp}@example.com`;
  const { error: otpErr } = await anon.auth.signInWithOtp({
    email: emailC,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback",
      data: { name: "Lerato Link", interests: ["chill"] },
    },
  });
  check("signInWithOtp accepted", !otpErr, otpErr?.message);
  await new Promise((r) => setTimeout(r, 1500));
  const inbox = (await fetch(`${MAILPIT}/api/v1/search?query=to:${emailC}`).then((r) =>
    r.json()
  )) as { messages?: { ID: string }[] };
  const msgId = inbox.messages?.[0]?.ID;
  let hasLink = false;
  if (msgId) {
    const msg = (await fetch(`${MAILPIT}/api/v1/message/${msgId}`).then((r) => r.json())) as {
      HTML?: string;
      Text?: string;
    };
    hasLink = /auth\/v1\/verify\?token=/.test(`${msg.HTML}${msg.Text}`);
  }
  check("magic-link email delivered with verify link", hasLink, msgId ?? "no message");

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll smoke checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
