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
- Three-column desktop layout: timer (~50%), today's sessions (~25%), stats+history (~25%)
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

## Active work
- Three-column layout: timer / sessions / stats+history with orange header line
- Cross-device timer sync via `active_timer` table (with tick() 24h safety net)
- Deep Dive analytics: 4 stat boxes, 1y heatmap, content width constrained to header line
- Theme picker: Notion-style dropdown with search and tooltip
- Activity dropdown: filtered by work type, chevron, hover tints
- Font sizes standardized across columns 2 and 3
- Supabase JS SDK pinned to v2.98.0, Clerk unpinned @5
