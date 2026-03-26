# GemTimer

## What it is
GemTimer is a minimalist focus timer and productivity tracker at gemtimer.com. Users start a session, label it (e.g. "Writing", "Code review"), tag it as Deep Work or Sustaining, and see their patterns over time. Film/TV quote themes (Sherlock Holmes, Breaking Bad, etc.) keep sessions engaging. The tagline: "The clock runs. Know where your time goes."

## Who it's for
Knowledge workers and students who want a clean, no-nonsense timer to track how they actually spend their focused time.

## Tech stack
- **Frontend**: Single-page vanilla HTML/CSS/JS (`index.html`, ~260KB, no framework)
- **Auth**: Clerk.js v5
- **Database**: Supabase (PostgreSQL) via direct fetch to REST API — session sync, active timer sync, quotes table
- **Storage**: localStorage-first with cloud sync for logged-in users
- **Hosting**: Vercel (gemtimer.com, redirects from elementarytimer.com)
- **Analytics**: Cloudflare Insights

## What's built
- Start/pause/reset timer with visual progress ring and lap counter (60min+)
- Deep Work vs. Sustaining work type toggle
- Pomodoro mode (25/5)
- Session history with add/edit/delete, grouped by day
- Deep Dive analytics: heatmap, trends, work type breakdown, weekly stats
- 36 film/TV quote themes with Notion-style dropdown picker, fetched from Supabase (hardcoded fallback)
- Cross-device timer sync via `active_timer` table (no websockets)
- Clerk auth with Supabase session sync (localStorage offline fallback)
- Multi-language support, mobile responsive, streak tracking

## Active work
- Cross-device timer sync via `active_timer` table in Supabase
- Replaced Supabase JS SDK with direct fetch calls to REST API
- Deep Dive analytics page: 1y heatmap (GitHub-style, Mon–Sun), time-of-day breakdown, hourly focus, activity breakdown, daily trend
- Theme picker redesigned as Notion-style single-select dropdown with search
- Sign-out button fixes on landing page and Deep Dive overlay
- Date/time centering matched across landing, login, and Deep Dive pages
