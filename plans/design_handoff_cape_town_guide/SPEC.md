# Kaap — Product Specification (Draft v1)

> Cape Town city guide. Companion to the interactive prototype
> (`prototype/Cape Town Guide - Pro.dc.html`). The prototype is the source of
> truth for layout and interaction; this document defines the systems, data and
> rules needed to make it real.

A mobile-first, responsive web app that helps locals and visitors discover the
best of Cape Town — restaurants, bars, outdoor adventures, classes, arts, family
outings and lowkey local gems — browsable by map and category, with honest Rand
prices, live opening hours and saveable lists.

## 1. Problem & goals
**The problem.** Cape Town has an enormous amount to do, but it's scattered across
Instagram, group chats, blogs and word of mouth. Newcomers miss the good stuff;
even locals default to the same few places. There's no single, trustworthy,
price-aware place that answers "what should I do, near me, right now, in my budget?"

**The goal.** One calm, beautiful guide where anyone can understand exactly what's
on offer and confidently try something new — from the icons to the spots locals
keep quiet.

**Success metrics**
- **Activation:** % of new users who save ≥1 spot in their first session.
- **Engagement:** weekly returning users; spots opened per session.
- **Discovery quality:** % of opened spots that are *not* in the top-10 most popular.
- **Intent:** taps on "Get directions" / "Reserve" / "Book".

## 2. Target users
- **Locals** (primary) — fresh ideas, lowkey spots, "open now near me" for tonight/this weekend.
- **Visitors & newcomers** — the highlights plus confidence about cost and how to get there.
- **Planners** — building a day out, a date, a family outing; want to save and organise.

## 3. Scope (ship in phases)
| Phase | Includes |
|---|---|
| **P1 — MVP** | Browse by area map + category, curated collections, spot detail, save spots (device-local), open-now, search. Curated data set. |
| **P2 — Accounts** | Sign-in, saved lists synced across devices, profile, interests personalisation, real geolocation distance. |
| **P3 — Community** | User reviews & photos, ratings, moderation, "been there" tracking. |
| **P4 — Depth** | Booking/reservation integrations, events & what's-on, editorial guides, notifications. |

The prototype shows the full Phase 1–2 experience.

## 4. Screens & information architecture
1. **Onboarding** — name, interests, location permission, sign-in options.
2. **Discover** — greeting, curated collections rail, stylized area map, filter/sort bar, category chips, spot list.
3. **Spot detail** — photo gallery, rating & reviews, description, "good for" tags, weekly hours, sticky action card (book / directions / save / contact), similar spots.
4. **Saved** — saved spots with All / Open now / Free tabs (P3: custom lists).
5. **Profile** — avatar, stats, interests, settings, sign out.

## 5. Feature specifications

### 5.1 Onboarding & accounts
- Collect **name** and **interests** (multi-select from the category set) to personalise the greeting and default ordering.
- Offer **"Use my current location"** — requests browser geolocation; used only to compute distance and sort "Nearest". Not stored server-side beyond the session unless the user opts in.
- **Sign-in:** email magic-link + Google and Apple OAuth. Use a hosted auth provider (Supabase Auth, Firebase Auth, Auth0, Clerk) rather than rolling your own.
- **Guest mode:** P1 allows use and saving without an account (device localStorage). On sign-in, migrate local saves to the account.

> **Decision needed:** account required to save in P1, or guest-mode acceptable? **Recommendation:** launch with guest-mode saving to reduce friction; add sync in P2.

### 5.2 Discover — collections, map, filters
- **Curated collections** are hand-picked lists (e.g. "Lowkey gems", "First-date spots", "Free this weekend", "Rainy-day ideas", "Sunset sessions", "Family day out"). Each is a named set of spot IDs (or a rule, e.g. "all free"). Editorial; set in the admin tool.
- **Stylized area map:** Cape Town neighbourhoods as tappable markers (V&A Waterfront, Bo-Kaap, City Bowl, Sea Point, Camps Bay, Woodstock, Observatory, Southern Suburbs, Constantia, Hout Bay, Muizenberg, Table Mountain). Tapping filters the list to that area. Keep as a signature browse mode; complement with a real interactive map (§7) on detail.
- **Filters:** Open now (toggle), Free only (toggle), category chips (single-select), area (from map).
- **Sort:** Recommended (default), Nearest (needs geolocation), Top rated, Price (low→high).
- **Search:** matches name, area, category and vibe tags; typo-tolerant at scale (§7).
- All filters combine (AND). Category chip counts reflect the current area/search context.

### 5.3 Spot detail
- Photo gallery (1 primary + thumbnails).
- Category · area · star rating · review count · live open/closed · distance.
- Description, "good for" vibe tags.
- **Weekly hours table** with today highlighted, computed from structured hours (§6.3).
- **Sticky action card:** price band + estimate, primary CTA (Reserve a table / Book a spot / Book tickets / How to get there — by category), Get directions (deep-link to Google/Apple Maps), Save, contact rows (today's hours, address, phone, website).
- "More like this" — up to 4 spots in the same category.

### 5.4 Saved & profile
- Saved list with All / Open now / Free tabs. P3: user-named custom lists.
- Profile: initials avatar, stats (saved / visited / reviews), editable interests, settings (account, location & units, manage lists, privacy, about), sign out.

## 6. Data model

### 6.1 Spot
Fields marked *enriched* can be auto-filled from a places provider; the rest are curated.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable slug, e.g. `truth-coffee`. |
| `name` | string | Display name. |
| `category` | enum | eat · bars · outdoor · classes · chill · arts · family. |
| `area` | enum | Neighbourhood ID (maps to a map marker). |
| `coords` | {lat, lng} | For real map + distance. |
| `priceBand` | 0–3 | 0 = Free, 1 = R (budget), 2 = RR (mid), 3 = RRR (splurge). |
| `priceEstimate` | string | Human text, e.g. `R55–90 pp`. See §8. |
| `blurb` | text | 1–2 sentence editorial description. |
| `tags` | string[] | Vibe tags: romantic, quiet, lively, kid-friendly… |
| `hours` | schedule | Structured weekly hours (§6.3). |
| `address` | string | *enriched* |
| `phone` | string | *enriched* |
| `website` / `bookingUrl` | url | Outbound CTA target. |
| `photos` | url[] | Hosted images (§7). *enriched* |
| `rating` / `reviewCount` | number | Aggregated (§6.4). *enriched* |
| `updatedAt` | date | Freshness signal for prices/hours (§8). |

### 6.2 User, Save, Review
- **User:** `id`, `name`, `email`, `authProvider`, `interests[]`, `homeArea?`, `createdAt`.
- **Save:** `userId`, `spotId`, `listId?`, `createdAt`.
- **Review:** `id`, `userId`, `spotId`, `rating` (1–5), `text`, `photos[]`, `createdAt`, `status` (pending / published / hidden).

### 6.3 Opening hours & "open now"
Store hours as structured data, not free text, so open-now can be computed:
- Per weekday: an array of open/close intervals (supports split hours and closed days), e.g. Monday `[{open:"07:00", close:"18:00"}]`, Tuesday `[]` (closed).
- **Open-now logic:** take the current day/time in `Africa/Johannesburg` (SAST, UTC+2) — **always compute in the venue's timezone, not the device's** — and check whether "now" falls in any interval for today.
- Handle "always open" (parks, promenades) and seasonal/public-holiday exceptions (P2+).

> The prototype computes open-now from the viewer's local clock as a stand-in. Production must anchor to SAST so it's correct for users browsing from abroad.

### 6.4 Ratings & reviews
- **Aggregate from a provider** (Google Places rating + count) — instant credibility, but you don't own it and display terms apply.
- **First-party reviews** — you own data and tone; needs accounts, moderation and cold-start effort.

**Recommendation:** provider ratings in P1–2, layer in first-party reviews from P3 and blend/label the source.

## 7. Technical recommendations
- **Frontend:** React (Next.js) or similar; installable **PWA** — mobile, on-the-go, sometimes-offline. Cache the spot list and last-viewed details for offline reads.
- **Backend / DB:** a managed stack (Supabase — Postgres + Auth + storage — or Firebase) for database, auth and image hosting quickly.
- **Real map:** Google Maps or Mapbox for the detail view and directions deep-links. Keep the stylized area map as the browse layer.
- **Places data:** Google Places API to enrich hours, photos, ratings, phone, address. Budget for per-request cost, cache aggressively, and respect Places display & caching policy.
- **Image hosting:** your own bucket/CDN for curated photos; hold rights/licences — do not scrape. User photos (P3) go through moderation.
- **Search:** client-side filter is fine at ~hundreds of spots; move to a search service (Algolia / Typesense / Postgres full-text) for typo-tolerance and scale.
- **Admin tool:** a simple internal CRUD dashboard to add/edit spots, set collections, and flag stale prices/hours. This keeps the data alive — a first-class P1 deliverable.
- **Pagination / lazy load:** past ~50 spots, paginate or infinite-scroll and lazy-load images.

## 8. Prices & data freshness
- Show both a **band** (R / RR / RRR / Free) and a **per-person estimate** in ZAR. Bands are stable; estimates drift.
- Every spot carries `updatedAt`. Surface "Prices are estimates, last checked {date}" and let users flag out-of-date info.
- Prices are guidance, never a transaction — always link out to the venue for the real number.

## 9. Data sourcing strategy
The single most important decision. Recommended **hybrid**:
- **Curated core** — your team hand-picks and writes up spots (especially the lowkey gems APIs miss). The product's soul and differentiator.
- **Provider enrichment** — auto-fill hours, photos, ratings, contact from Google Places, refreshed on a schedule.
- **User contributions** (P3) — suggestions, reviews, photos, corrections, all moderated.

> **Recommendation:** nail §9 (sourcing) and §5.1 (accounts) before writing feature code — the whole backend shape follows from these two.

## 10. Non-functional requirements
- **Responsive:** mobile-first, works to desktop. Touch targets ≥ 44px.
- **Accessibility:** semantic HTML, keyboard navigable, sufficient colour contrast, alt text on all imagery.
- **Performance:** fast first paint, lazy images, cached lists; usable on patchy mobile data.
- **Localisation:** ZAR pricing and SAST throughout; English at launch.

## 11. Privacy & compliance (POPIA)
- South Africa's **POPIA** applies. Publish a clear privacy policy and collect only what you need.
- **Location** is sensitive — request just-in-time, explain why, use only to sort by distance, don't persist without explicit consent.
- Provide account deletion and data export. Obtain consent for marketing comms.
- Standard Terms of Service and cookie/consent handling.

## 12. Open questions for the team
1. Accounts required to save at launch, or guest-mode first? (Rec: guest-mode.)
2. Ratings: provider-sourced, first-party, or both? (Rec: provider → blend later.)
3. Primary CTA per category — integrate real booking (P4) or link out only?
4. Geographic scope — greater Cape Town only, or expand to Winelands / West Coast later?
5. Who owns keeping data fresh, and how often are prices/hours re-checked?
6. Monetisation, if any (featured listings, affiliate booking) — and how to keep it honest.

---
*Companion prototype: `Cape Town Guide - Pro`. Photos, review content and live distance in the prototype are placeholders for the real integrations above.*
