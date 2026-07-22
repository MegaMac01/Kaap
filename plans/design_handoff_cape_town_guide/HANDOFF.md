# Handoff: Kaap — Cape Town Activity Guide

## Overview
Kaap is a mobile-first, responsive web app that helps locals and visitors discover
things to do in Cape Town — restaurants, bars, outdoor activities, classes, arts,
family outings and lowkey local gems — browsable by an area map and by category,
with honest Rand (ZAR) prices, live opening hours, and saveable lists.

This bundle is everything a developer needs to start building.

## About the design files
The files in `prototype/` are **design references created in HTML** — working
prototypes that show the intended look, layout, copy and interactions. **They are
not production code to copy directly.**

The prototype is built with a small custom component framework (`support.js` + the
`.dc.html` files). Your task is to **recreate these designs in a real codebase**
using its established patterns and libraries. There is no existing app yet, so
**choose an appropriate stack** — the recommendation (see `SPEC.md` §7) is a
**Next.js PWA with a managed backend such as Supabase**.

Treat the `.dc.html` files as the source of truth for **visual design and
interaction**; treat `SPEC.md` as the source of truth for **systems, data model,
business rules and scope**.

To view the prototype: open `prototype/Cape Town Guide - Pro.dc.html` in a browser.
`Cape Town Guide.dc.html` is an earlier, simpler version kept for reference.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, copy and interactions are all
intentional and should be recreated faithfully. Exact values are in the
**Design Tokens** section below and are readable in the prototype source.

The only placeholders (which map to real integrations, see `SPEC.md`):
- **Photos** — striped blocks labelled `photo: <name>`. Replace with real hosted images.
- **Reviews** — sample review content. Replace with provider or first-party reviews.
- **Distance** — deterministic fake values. Replace with real geolocation math.
- **Open-now** — computed from the viewer's local clock; production must use SAST (see §6.3).

---

## Screens / Views

### 1. Onboarding
- **Purpose:** capture name + interests, request location, offer sign-in; personalises Discover.
- **Layout:** two-column split on ≥900px (left = full-bleed decorative panel with tagline; right = form, max-width 420px, centered). Single column (form only) below 900px.
- **Components:**
  - Logo lockup: terracotta dot (11px) + "Kaap" (Instrument Serif 26px) + "CAPE TOWN" (11px, uppercase, letter-spacing 2px, `#7a7565`).
  - H1 "Let's set you up" (Instrument Serif 34px). Sub-copy 14.5px `#7a7565`.
  - Name text input: full width, padding 13px 15px, radius 12px, bg `#fffdf6`, 1px border `rgba(44,74,59,0.2)`.
  - Interest chips (multi-select): pill buttons, 9px 15px, radius 999px. Selected = bg `#2c4a3b`/white text; unselected = bg `#fffdf6`/`#3c4238` text, 1px border.
  - "Use my current location" — dashed-border button; label toggles to "✓ Using your location".
  - Primary CTA "Start exploring →" — bg `#2c4a3b`, white, radius 12px, weight 700.
  - "or continue with" divider + Google / Apple buttons.
  - POPIA/privacy microcopy (11.5px `#a49d8b`).

### 2. Discover (home)
- **Purpose:** the main browse surface — collections, map, filters, spot list.
- **Layout:** sticky header. Body max-width 1200px. Greeting block, then horizontal collections rail, then a two-column region that **wraps** responsively: left = map card (flex-basis 380px, sticky at top:84px), right = filters + category chips + spot list (flex 1, min 300px). Columns stack when narrow.
- **Components:**
  - **Header (sticky, z-30):** logo (left), centered search pill (`#fffdf6`, radius 999px, max 360px), nav buttons Discover / Saved (with count badge) / avatar. Active nav = bg `#2c4a3b` white.
  - **Greeting:** "Good {morning/afternoon/evening}, {firstName}." (Instrument Serif, clamp 26–40px) + sub-line.
  - **Collections rail:** horizontal-scroll row of cards (flex 0 0 210px, min-height 128px, radius 16px). Each: coloured icon tile (34px, radius 10px), label (15px/700), description (12px), count. Active card = bg `#2c4a3b` white + 2px border.
  - **Map card:** ocean-gradient panel (aspect 4/5), stylized land mass via `clip-path` polygon, a flat "Table Mtn" block, "Atlantic"/"False Bay" italic labels, and absolutely-positioned area markers (dot + label). Active marker = terracotta dot with glow ring. Footer row: area hint + "Reset" pill.
  - **Filter/sort bar:** "Open now" toggle (active = green bg `#e6f0e6`, border `#2f7d52`), "Free only" toggle, divider, sort text-buttons (Recommended / Nearest / Top rated / Price; active = bg `rgba(44,74,59,0.12)`).
  - **Category chips:** horizontal-scroll pills with count badge. Active = bg `#2c4a3b` white.
  - **List header:** title (Instrument Serif, clamp 22–30px) + result count.
  - **Spot card (list row):** flex row, bg `#fffdf6`, radius 16px, padding 12px, 1px border, shadow `0 8px 22px -18px rgba(44,74,59,0.6)`, hover lifts shadow. Contains: 92px striped thumb (category-coloured), category label (11px uppercase terracotta) · area, name (17px/700), 2-line blurb, rating (★ + value + review count), open/closed status, distance, a heart save button (34px circle; saved = terracotta bg white heart), and price band (15px/800 `#2c4a3b`) + estimate.
  - **Empty state:** message + "Clear filters" CTA.

### 3. Spot detail
- **Purpose:** everything about one spot + actions.
- **Layout:** max-width 1000px. Back button. Photo gallery grid (2fr main + 1fr column of 2 thumbs), height clamp 220–380px. Below: two-column wrap — left = content (flex 440px), right = sticky action card (flex 300px, top:84px).
- **Components:**
  - Gallery tiles: category-striped blocks, radius 14–18px, monospace `photo` labels.
  - Category · area (12px uppercase terracotta). Name (Instrument Serif, clamp 30–46px).
  - Meta row: ★ rating · review count · open/closed · distance.
  - Description (16px, line-height 1.65, max 620px).
  - "Good for" vibe-tag pills (bg `rgba(44,74,59,0.08)`, `#2c4a3b`).
  - **Weekly hours table:** card `#fffdf6`, radius 14px, one row per day (Mon–Sun); today's row highlighted `rgba(207,106,63,0.08)` + bold; closed days show "Closed" in `#b5573f`. Time text is `white-space:nowrap`.
  - **Reviews:** heading + "Write a review" button; each review = coloured initials avatar (40px) + name + star string + relative time + text.
  - **Sticky action card:** price (26px/800) + band word; primary CTA (terracotta) whose label depends on category — "Reserve a table" (eat/bars), "Book a spot" (classes), "Book tickets" (paid), "How to get there" (free); "Get directions ↗" (deep-links Google Maps); Save button; contact rows (today's hours, address, phone `tel:` link, website).
  - **"More like this":** horizontal rail of compact cards (240px) from the same category.

### 4. Saved
- **Purpose:** the user's saved spots.
- **Layout:** max-width 960px. Title + subtitle. Tab pills (All / Open now / Free with counts). Vertical list of compact saved-spot rows. Empty state with CTA.

### 5. Profile
- **Purpose:** identity, stats, interests, settings.
- **Layout:** max-width 640px. Avatar (64px green circle, initials) + name + joined line. 3-up stats grid (Saved / Visited / Reviews). Interests pills. Settings list card (Account, Location & units, Manage lists, Privacy (POPIA), About). "Sign out" outlined button.

---

## Interactions & behavior
- **Navigation** is screen-state based: `onboard → discover ⇄ detail`, plus `saved` and `profile`. Opening a spot scrolls to top. "Back" and logo return to Discover. Sign out resets to onboarding and clears session state.
- **Filters combine (AND):** collection + category + area + open-now + free-only + search. Category chip counts recompute against the current area/search/collection context.
- **Sort:** Recommended (curated order), Nearest (by distance), Top rated (rating desc), Price (band asc).
- **Save (heart):** toggles membership in the saved set; `stopPropagation` so it doesn't open the card. Reflected live in the Saved count badge.
- **Search:** case-insensitive match on name + area + tags + category label.
- **Open-now:** computed from structured weekly hours vs. current time — **anchor to `Africa/Johannesburg` (SAST) in production.**
- **Hover:** spot cards lift their shadow (transition ~.12s).
- **Responsive:** all multi-column regions use flex-wrap with min-widths so they stack on mobile; touch targets ≥ 44px; type sizes use `clamp()`.

## State management
Needed state (see prototype logic for exact shape):
`screen`, `name`, `interests{}`, `located`, `area`, `cat`, `query`, `sort`,
`openNow`, `freeOnly`, `collection`, `fav{}` (saved set), `selected` (spot id),
`savedTab`. In production: persist `fav` and `interests` to the account (or
localStorage in guest mode), fetch spots/reviews from the backend, and read
geolocation for distance.

## Design tokens

### Colours
| Token | Hex |
|---|---|
| Page background | `#efe8d8` |
| Surface / card | `#fffdf6` |
| Ink (primary text) | `#23281f` |
| Ink soft | `#3c4238` / `#4a4f43` |
| Muted text | `#7a7565` / `#9a9483` / `#a49d8b` |
| Accent (terracotta) | `#cf6a3f` (hover `#b0512a`, deep `#a94f28`) |
| Deep green (primary UI) | `#2c4a3b` |
| Success / open | text `#2f7d52`, bg `#e6f0e6` |
| Closed / destructive | `#b5573f` |
| Star | `#e0a53f` |
| Hairline borders | `rgba(44,74,59,0.12)`–`0.2` |
| Map ocean | `#c7ddd8` → `#b2cfc8` |
| Map land | `#e9dfc6` → `#e0d3b3` |
| Map mountain | `#8ca596` |

**Category accent pairs** (used for striped photo placeholders — replace with real photos):
eat `#cf6a3f`/`#a94f28` · bars `#7a4b6b`/`#59314d` · outdoor `#3f7d5c`/`#2c5a41` ·
classes `#c58a3d`/`#9c6a26` · chill `#5c7a8c`/`#3f5a69` · arts `#a2593f`/`#7d3f2c` ·
family `#5b8f7a`/`#3f6b58` · free `#7d8452`/`#5c623a`.

### Typography
- **Display / headings:** Instrument Serif (Google Fonts), weight 400, often used large.
- **Body / UI:** Hanken Grotesk (Google Fonts), weights 400–800.
- **Mono (placeholder labels):** `ui-monospace, monospace`.
- Body 14–16px, line-height ~1.6; headings use `clamp()` for responsive scaling.

### Spacing, radius, shadow
- Card padding 12px; panel padding 14–20px.
- Radius: thumbs 12px, cards 16px, panels 18–20px, pills/buttons 999px.
- Card shadow: `0 8px 22px -18px rgba(44,74,59,0.6)`.
- Gaps: 8px (chips), 14px (list), 12–26px (regions).

## Assets
- **Fonts:** Instrument Serif + Hanken Grotesk via Google Fonts.
- **Images:** none included — all imagery is placeholder. Source/licence real photos for each spot (see `SPEC.md` §7). Do not scrape.
- **Icons:** simple Unicode glyphs are used as stand-ins (★ ♥ ◎ ☼ ☂ etc.); swap for a proper icon set (e.g. Lucide/Phosphor) in the real build.

## Files
- `prototype/Cape Town Guide - Pro.dc.html` — the full, high-fidelity prototype (primary reference).
- `prototype/Cape Town Guide.dc.html` — earlier simple version (reference only).
- `prototype/support.js` — the prototype framework runtime (lets the HTML run in a browser; not for production).
- `SPEC.md` — the product specification: problem, scope, feature specs, data model, tech recommendations, POPIA, open questions.
- `KICKOFF_PROMPT.md` — a ready-to-paste prompt to start Claude Code.
