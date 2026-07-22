# Kickoff prompt for Claude Code

Copy everything below the line into Claude Code, with this folder open in your
project. Adjust the stack line if you have a preference.

---

I'm building **Kaap**, a mobile-first responsive web app for discovering things to
do in Cape Town (restaurants, bars, outdoor activities, classes, arts, family
outings and lowkey local spots), browsable by an area map and by category, with
Rand prices, live opening hours and saveable lists.

This folder is a design handoff. Please read, in order:
1. `README.md` — how to use this bundle + full design/interaction/token reference.
2. `SPEC.md` — product spec: scope, feature specs, data model, tech recommendations, POPIA, open questions.
3. `prototype/Cape Town Guide - Pro.dc.html` — the high-fidelity prototype. Open it in a browser to see the intended design and interactions.

**Important:** the files in `prototype/` are **design references**, not production
code. They use a small custom HTML framework (`support.js`) — do **not** ship them
as-is. Recreate the designs faithfully in a real codebase.

**Stack:** build it as a **Next.js (App Router) PWA with TypeScript, Tailwind CSS,
and Supabase** (Postgres + Auth + Storage). If you'd recommend something different,
tell me why before starting.

**Where to start (Phase 1 / MVP per SPEC §3):**
1. Set up the project + a proper design-token config (colours, fonts, radii from
   README "Design Tokens"). Fonts: Instrument Serif (display) + Hanken Grotesk (body).
2. Implement the **Spot data model** (SPEC §6.1) and seed it from the ~23 spots in
   the prototype's data (see the `spotsData` array in the `.dc.html` logic).
3. Build the **Discover** screen: collections rail, stylized area map, filter/sort
   bar, category chips, spot list. Filters combine (AND).
4. Build the **Spot detail** screen with the weekly-hours table and sticky action card.
5. Wire **guest-mode saving** (localStorage) + the Saved screen.
6. Implement **open-now** correctly — compute against `Africa/Johannesburg` (SAST),
   not the device clock (SPEC §6.3).

Match the prototype's warm, calm visual style precisely (exact hex values and type
in README). Use real icons (e.g. Lucide) instead of the Unicode glyph placeholders,
and leave clearly-marked TODOs where real photos, reviews, geolocation distance and
a Places API integration will plug in (SPEC §7).

Before you write code, give me a short plan: proposed folder structure, the Spot
schema as SQL/TypeScript, and the order you'll build things in.
