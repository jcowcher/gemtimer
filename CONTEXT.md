# GemTimer

## What it is
GemTimer is a minimalist focus timer and productivity tracker at gemtimer.com. Users start a session, label it (e.g. "Writing", "Code review"), tag it as Deep Work or Sustaining, and see their patterns over time. Film/TV quote themes (Sherlock Holmes, Breaking Bad, etc.) keep sessions engaging. The tagline: "The clock runs. Know where your time goes."

## Who it's for
Knowledge workers and students who want a clean, no-nonsense timer to track how they actually spend their focused time.

## Tech stack
- **Frontend**: Single-page vanilla HTML/CSS/JS (`index.html`, ~260KB, no framework)
- **Auth**: Clerk.js v5
- **Database**: Supabase (PostgreSQL, JS SDK v2.98.0) — session sync, active timer sync, quotes table, feature flags table
- **Storage**: localStorage-first with cloud sync for logged-in users
- **Hosting**: Vercel — `main` → `gemtimer.com` (production, `www` redirect); `dev` → `preseason.gemtimer.com` (staging, Vercel Standard Protection-gated)
- **Analytics**: Cloudflare Insights

## What's built
- Three-column desktop layout: sessions (left 25%), timer (center 50%), history (right 25%)
- Start/pause/reset timer with visual progress ring and lap counter (60min+)
- Deep Work vs. Sustaining work type toggle (tooltips match pill colors)
- Pomodoro mode (25/5)
- Session history with daily bar chart, By Activity summary
- Deep Dive analytics: 4 stat boxes, 1y heatmap, hourly focus, activity breakdown, daily trend
- 36 film/TV quote themes with Notion-style dropdown picker (search, keyboard nav, tooltip)
- Activity suggestions filtered by work type with chevron and work-type-aware hover tints
- Cross-device timer sync via `active_timer` table (no websockets)
- Clerk auth with Supabase session sync (localStorage offline fallback)
- Multi-language support, mobile responsive, streak tracking
- **Interactive trial timer on landing page** — hover reveals a Start state, click to name and run a real session using Deep Work or Sustaining mode; after 3 completed sessions (tracked in `localStorage.gemtimer_sessions`) the timer converts into a "Get started" CTA that triggers Clerk sign-up. Self-contained state machine that deliberately never touches authenticated timer state.
- **Staging environment** at `preseason.gemtimer.com` — deploys from `dev` branch, gated by Vercel Standard Protection (Jeremy's Vercel team login), uses production Clerk + Supabase so signed-in previews show real data. Dev → preseason → main is now the ops flow for anything data-dependent.
- **Feature flag kill-switch system** — five global flags in Supabase `feature_flags` table (`carve_outs`, `pomodoro_mode`, `deep_dive`, `supabase_sync`, `clerk_auth`), read non-blocking on page load. Flipped via `npm run flag:disable <key>` / `flag:enable <key>` / `flag:list` using a service-role CLI at `scripts/flag.js`. Takes effect on next page load for each user; no redeploy required. Rule: new risky features must be wrapped in a flag before shipping.
- **Localhost breaker fixtures** — `seedBreakers()` / `clearBreakers()` console helpers active only on `localhost:3001`. Writes ~15 synthetic sessions to localStorage designed to stress layout (long names, dense days, marathon + nano durations, gap days). Tagged so `migrateLocalToSupabase` can never push them to cloud.

## Active work
- Code hygiene pass completed (see CLAUDE.md "Code Hygiene" for details): 5-sequential-agent cleanup of `index.html` removed ~200 lines of AI slop, dead code, and unreferenced identifiers; introduced `persistNewSession` and `showSignInCodeStep` helpers; all 5 commits merged to `main` and deployed.
- Deep Dive overlay restructured: 2×3 stat card grid (Total Focus, Daily Avg, Best Day / Sessions, Active Days, Peak Hour), dropped 7d toggle (now This week · 30d · 1y), added Work Type Total row, fixed grid cell sizing with `align-content: start`.
- Deferred cleanup items tracked in CLAUDE.md: `toDateKey` consolidation across 3 hand-rolled `YYYY-MM-DD` builders; duplicate top-level `tick()` name shared between landing trial timer IIFE and authenticated timer.
- Supabase JS SDK pinned to v2.98.0, Clerk unpinned @5.
- **Dev/staging/prod pipeline established** (2026-04-23): dev branch auto-deploys to `preseason.gemtimer.com` via Vercel Preview environment, gated by Standard Protection. Same Clerk + Supabase as prod. Next on deck: replicate the pattern to IdeaKache and PoolRoom (separate sessions).
- **Clerk Development instance parked, not deleted** — exists as a separate environment in the Clerk dashboard but no longer wired into the app. Kept because Hobby plan only exposes application-level delete, which would destroy production. Harmless dormant state.
