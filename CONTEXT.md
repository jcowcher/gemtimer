# GemTimer

## What it is
GemTimer is a minimalist focus timer and productivity tracker at gemtimer.com. Users start a session, label it (e.g. "Writing", "Code review"), tag it as Deep Work or Sustaining, and see their patterns over time. Film/TV quote themes (Sherlock Holmes, Breaking Bad, etc.) keep sessions engaging. The tagline: "The clock runs. Know where your time goes."

## Who it's for
Knowledge workers and students who want a clean, no-nonsense timer to track how they actually spend their focused time.

## Tech stack
- **Frontend**: Single-page vanilla HTML/CSS/JS (`index.html`, ~260KB, no framework)
- **Auth**: Clerk.js v5
- **Database**: Supabase (PostgreSQL, JS SDK v2.98.0) — session sync, active timer sync, quotes table
- **Storage**: localStorage-first with cloud sync for logged-in users
- **Hosting**: Vercel (gemtimer.com, redirects from elementarytimer.com)
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

## Active work
- Code hygiene pass completed (see CLAUDE.md "Code Hygiene" for details): 5-sequential-agent cleanup of `index.html` removed ~200 lines of AI slop, dead code, and unreferenced identifiers; introduced `persistNewSession` and `showSignInCodeStep` helpers; all 5 commits merged to `main` and deployed.
- Deferred cleanup items tracked in CLAUDE.md: `toDateKey` consolidation across 3 hand-rolled `YYYY-MM-DD` builders; duplicate top-level `tick()` name shared between landing trial timer IIFE and authenticated timer.
- Supabase JS SDK pinned to v2.98.0, Clerk unpinned @5.
- Vercel deploys from `main` only — `dev` branch does not build preview deployments.
