# CLAUDE.md

GemTimer — minimalist focus timer and productivity tracker at gemtimer.com.

## Tech Stack

- **Frontend**: Single-page vanilla HTML/CSS/JS — everything lives in `index.html` (~6,920 lines, ~310KB). No framework, no build step, no package.json.
- **Auth**: Clerk.js v5 (loaded from CDN). Custom sign-in form (not Clerk's mounted UI) for password manager compatibility.
- **Database**: Supabase (PostgreSQL, JS SDK v2.98.0 pinned) — cloud session sync, active timer sync, quotes table. Migrations in `supabase/migrations/`.
- **Storage**: localStorage-first, cloud sync for logged-in users. Key: `et_sessions`.
- **Hosting**: Vercel (gemtimer.com). `vercel.json` redirects elementarytimer.com → gemtimer.com. Only `main` triggers production deploys — the `dev` branch does **not** build preview deployments. To preview dev work, either merge to `main` or configure Vercel preview branches separately.
- **Analytics**: Cloudflare Insights.
- **DNS/Domain**: gemtimer.com (formerly elementarytimer.com).

## Architecture

**Single HTML file.** All CSS (`<style>`), JS (`<script>`), and HTML are in `index.html`. No modules, no bundler.

**Offline-first sync pattern:**
1. Sessions save to localStorage immediately
2. For logged-in users, sessions also save to Supabase
3. On load, cloud sessions merge with local; dedup runs on `date|duration|name` key
4. `_sb_id` is written back to localStorage after Supabase save (prevents future duplicates)
5. Cross-device timer sync: `active_timer` table stores running timer state (started_at, accumulated seconds, activity, work type, pomodoro state). On page load, any active timer is restored using `accumulated + (now - started_at)`. Stale timers (>24h) are auto-deleted. No websockets needed.

**Auth flow:** Clerk CDN script loads async → poll `window.Clerk` every 100ms (up to 10s) → custom sign-in form (email + password shown together for password manager compatibility, OTP fallback). OAuth buttons (e.g. Google) shown above the form. Forgot Password triggers Clerk's reset_password_email_code flow.

**Three-column desktop layout** (left 25% / center 50% / right 25%):
- Left: "Today's breakdown" header + Pomodoro, session list, "Add a session", By Activity, By type of work (Deep Work / Sustaining split)
- Center: Timer (centered), work type toggle, activity input with chevron, buttons, theme dropdown
- Right: "History" header, Today/Daily Avg stats, week nav (centered), bar chart, Deep Dive button
- CSS `order` reorders visually (HTML: timer, sessions, stats)
- Vertical divider lines between columns, full height (`align-items: stretch`)
- Orange 2px header line under nav; grey footer line at bottom
- Mobile collapses to single column (timer first); landing page hides clock and footer on mobile

**Quotes system:** 36 film/TV themes × 15 quotes each. Primary source: Supabase `quotes` table. Fallback: hardcoded `QUOTE_THEMES` object in JS. Fetched on theme select with race condition guard (stale theme check after async return).

## File Structure

```
index.html           # The entire app (HTML + CSS + JS)
privacy.html         # Privacy policy
vercel.json          # Domain redirects
robots.txt / sitemap.xml
favicon.png / og-image.png / linkedin-*.png
google4d949a4962a07105.html  # Search Console verification
supabase/migrations/ # DB schema + seed data for quotes
CONTEXT.md           # Project overview (human-written)
NOTES.md             # Non-obvious workarounds and patterns (read before touching tricky areas)
.env.local           # Clerk + Supabase keys (gitignored)
.github/workflows/   # GitHub Pages deploy (backup; primary is Vercel)
```

## Running Locally

No build step. Open `index.html` in a browser, or:
```
npx serve .
```
Auth and cloud sync require the Clerk/Supabase keys in `.env.local` — but these are loaded from CDN in the HTML, so the app works unauthenticated without them.

## Key Features (Shipped)

- Three-column desktop layout: sessions (left), timer (center), history (right)
- Timer with circular progress ring + lap counter (chimes at 60min via Web Audio API)
- Deep Work vs. Sustaining work type toggle (tooltips match pill colors)
- Pomodoro mode (25/5)
- Session history: add/edit/delete, with daily bar chart
- Deep Dive analytics: 6 stat cards in 2×3 grid (Row 1: Total Focus, Daily Avg, Best Day; Row 2: Sessions, Active Days, Peak Hour), Work Type panel with Total row, time range toggle (This week · 30d · 1y), 1y heatmap (Mon–Sun, bigger squares, renders to current week), hourly focus, activity breakdown, daily trend
- 36 quote themes with Notion-style dropdown (search, keyboard nav, hover tooltip)
- Activity dropdown filtered by work type, with chevron and work-type-aware hover tints
- Clerk auth with Supabase sync (Supabase JS pinned to v2.98.0, Clerk unpinned @5)
- Multi-language (en, es, fr, de, pt, ja)
- Mobile responsive, touch-optimized

## Critical Workarounds (Don't Break These)

Read `NOTES.md` for full details. The most dangerous ones:

1. **Session dedup on load** — removing this will cause duplicate sessions to accumulate
2. **`_sb_id` writeback** — removing this breaks local↔cloud matching, causing duplicates
3. **Clerk polling** — without it, auth silently fails on slow connections
4. **`void badge.offsetWidth`** — CSS animation reflow trick for lap badge; looks like dead code but isn't
5. **`setTimeout(() => ctx.close(), 2500)`** — Web Audio cleanup; removing causes memory leaks on mobile
6. **Quotes fetch race guard** — checks `activeThemeKey` after async return to discard stale results
7. **Sort comparator NaN guard** — `.sort()` comparators must always return a valid number. Invalid date comparisons produce NaN, causing infinite loops in some browsers (especially Safari/WebKit). Use `|| 0` fallback.
8. **`tick()` 24h safety net** — if `elapsed > 86400`, timer is killed immediately. Prevents corrupted sync data from saving as a session.
9. **`splitSessionByDay` duration cap** — caps at 86400s to prevent the while loop from iterating thousands of times on corrupted data.

## Conventions

- **No framework** — this is intentionally vanilla JS. Don't introduce React/Vue/etc.
- **Single file** — all app code stays in `index.html`. This is a deliberate choice.
- **localStorage key** — `et_sessions` (legacy from ElementaryTimer name, don't rename — would lose user data)
- **Date format** — `YYYY-MM-DD` strings throughout
- **Work types** — always `'deep'` or `'sustaining'` (lowercase strings)
- **Session shape** — `{date, duration, name, type, manual, _sb_id}`
- **Supabase table** — `timer_history` for sessions, `quotes` for theme quotes
- **CSP headers** — defined in a `<meta>` tag; update if adding new external domains
- **i18n** — translation keys in a JS object, `t(key)` function. Add translations to all 6 languages.
- **Deploy merges** — when merging `dev` to `main`, always use `--no-ff` with a descriptive commit message summarising what changed since the last deploy.

## Code Hygiene

A 5-pass sequential cleanup ran on `index.html` (commits `a6181da` → `82abe2b` on dev, merged to main via `1eedc4d` and deployed). Each pass was run by a separate agent, in order:

1. **AI slop / comments removal** (`a6181da`) — ~160 unhelpful comment lines removed (generic filler, in-motion narration, leftover debug `console.log`s). Load-bearing "why" comments rewritten concisely.
2. **Deprecated / legacy / fallback paths** (`8b884f6`) — removed `syncPomoPillColor` no-op stub (+ 4 call sites) and unused `getWeekSessions` helper. Confirmed repo has zero `TODO/FIXME/XXX` markers and no commented-out JS blocks.
3. **Defensive try/catch cleanup** (`c6a44a1`) — 20 `try` blocks audited, 1 cargo-cult guard removed (the `nameInput.focus()` call on the landing trial timer). All remaining `try/catch` wraps a legitimate throwable surface: Clerk, Supabase, Wake Lock, Web Audio, localStorage, `JSON.parse` of persisted data, iOS noSleep video, quotes race guard, and the `tick()` 24h safety net. When adding new error handling, only wrap calls that can genuinely throw at runtime — don't cargo-cult.
4. **DRY / deduplication** (`2d6be11`) — three consolidations:
   - **`persistNewSession(session)`** helper (at the top of the session-save code path) replaces 4 near-identical `sessions.push → localStorage.setItem → await saveSessionToSupabase → _sb_id writeback` blocks. New save paths should call this helper, not reimplement the sequence.
   - **`showSignInCodeStep()`** helper replaces 3 identical DOM plumbing sequences in the Clerk sign-up / sign-in / forgot-password flows (disable email, hide password + forgot wraps, show code wrap, focus code input, set submit label).
   - **Landing overlay wiring** — Why/What/How overlay openers collapsed into one `forEach` over `[linkId, overlayId, closeId]` tuples.
5. **Unused code sweep** (`82abe2b`) — grep-based (no `knip`/`madge` on a single HTML file). Removed `playIcon` / `btnText` / `txt` vars, the `.dot { display: none }` CSS rule, and 4 spare HTML `id=` attributes (`landingTryNameWrap`, `landingTryControls`, `landingTryCtaSub`, `historySection`) whose CSS selectors use class selectors only.

Net: 7128 → 6919 lines (−209). All 9 protected workarounds listed under "Critical Workarounds" and all NOTES.md patterns were preserved.

### Known deferred cleanup
- **`toDateKey` consolidation** — three hand-rolled `YYYY-MM-DD` builders remain at approximately lines 6110 (heatmap 1y cutoff), 6243 (heatmap week key), and 6833 (Add Session default date). A `toDateKey(d)` helper already exists and is used by `renderSessions` / `renderHistory`. Unifying the stragglers was deferred to avoid forward-reference risk on the startup path — one of them lives inside the protected dedup IIFE, which runs before `toDateKey` is declared. Future pass welcome if you move the helper earlier or accept the startup ordering constraint.
- **Duplicate `function tick()`** — there are two `tick()` declarations: one inside the `initLandingTryTimer` IIFE (landing trial timer, self-contained) and one at top-level (authenticated timer). They don't collide because they're in separate scopes, but it's easy to mistake one for the other when searching.
- **Stale `.timer-wrap svg { display: none; }`** — no `<svg>` currently lives inside `.timer-wrap`, but the rule is defensive and harmless. Could be removed in a future targeted pass.

## Supabase Schema

**`timer_history`**: id, user_id, duration (seconds), date (YYYY-MM-DD), name, type, manual, created_at
**`quotes`**: id, quote, source_theme, character, created_at. RLS: public read, admin write.
**`active_timer`**: user_id (PK), started_at (timestamptz), accumulated (integer, seconds), is_running (boolean), activity_name, work_type, pomodoro_mode, pomodoro_phase, updated_at. RLS: users manage own row.

## Non-Obvious Details

- Spacebar = start/pause, R = finish session (keyboard shortcuts)
- Easter eggs exist: typing certain keywords or clicking the logo 7 times triggers special quotes
- Heatmap weeks start Monday, end Sunday. The "1y" tab shows a rolling 365-day window. Month labels have collision detection — labels skip if they'd overlap the previous one.
- Hourly focus map splits sessions across hour boundaries
- Streak counter peeks at yesterday if today is empty
- `@media (hover: none)` resets all hover states for touch devices
- Deep Dive overlay grid: `.dd-overlay-grid` uses `align-content: start` so grid rows size to content instead of stretching. Don't remove this property if you change the grid or add rows — without it, stat cards overflow their cell and a gap appears below the Work Type panel.
