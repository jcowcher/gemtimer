# Notes

Non-obvious decisions, workarounds, and things that bit me.

---

**Clerk custom sign-in form instead of mounted component**
Clerk's pre-built UI doesn't play well with 1Password autofill. Built a custom sign-in form with native `<input>` fields that password managers recognize. Email and password fields are shown simultaneously (not two-step) so mobile password managers (1Password) can detect and autofill both. OAuth buttons (Google) appear above the form with an "or" divider. Forgot Password triggers Clerk's `reset_password_email_code` flow.
`00843bc`, `84b9735`

**Clerk polling on load (100ms × 100 attempts)**
Clerk script loads async from CDN and sometimes takes seconds. Poll for `window.Clerk` up to 10s, then degrade to unauthenticated mode. Without this, auth silently breaks on slow connections.

**Session dedup runs on every page load**
Cloud sync + localStorage can produce duplicate sessions (e.g. tab crashes mid-sync, or network timeout after Supabase insert but before localStorage update). A one-time IIFE deduplicates on `date|duration|name` key at startup.
`83e550b`, `f9286cf`

**Supabase duplicate cleanup is fire-and-forget**
After dedup, cloud-side orphan rows are deleted via `.delete().in('id', dupIds).then(() => {})` — no await. UI renders immediately while cleanup happens in the background.

**`_sb_id` written back to localStorage after Supabase save**
When a session saves to Supabase, the returned row ID gets attached to the local session object and persisted. Without this, future syncs can't match local ↔ cloud records, causing duplicates.

**`void badge.offsetWidth` to restart CSS animations**
Removing and re-adding a class in the same paint cycle doesn't replay the animation. Reading `offsetWidth` forces a reflow between remove/add, so the lap badge flash fires every hour.
`7bcd41e`

**Heatmap quartiles fall back to `|| 1`**
With very few sessions, `nonZero[Math.floor(nonZero.length * 0.25)]` can be `undefined`. The `|| 1` prevents the intensity bucketing from collapsing to all-zero.

**Heatmap week alignment: rewind to Monday, extend to Sunday**
GitHub-style heatmap needs full weeks. Start date rewinds to nearest Monday; "1y" view shows a rolling 365-day window. Partial weeks at the edges looked broken without this.
`b430b96`, `bbba15d`, `c9d142f`

**Hourly focus map splits sessions across hour boundaries**
A 2-hour session starting at 3:45 PM gets 15 min in the 3 PM bucket and 105 min in the 4 PM bucket. The algorithm walks each session with a cursor, truncating at hour boundaries.

**Streak counter checks yesterday when today is empty**
If you haven't logged a session today, you might still be on a streak from yesterday. The `else if (streak === 0)` branch peeks back one day before breaking.

**Touch hover states get stuck on mobile**
CSS `:hover` sticks after a tap on touch devices. `@media (hover: none)` resets every hover effect to its default state so buttons don't stay highlighted.
`e1915b8`

**`setTimeout(() => ctx.close(), 2500)` after bell chime**
Web Audio API contexts leak on mobile if not closed. The 2.5s delay lets the bell finish ringing before cleanup. Also uses `webkitAudioContext` fallback for Safari.
`55eaaed`

**Add Session required double-click when suggestion dropdown was open**
The suggestion dropdown's blur handler was eating the first click on the submit button. Fixed by adjusting event timing.
`4afc80b`

**Tooltip text destroyed by `applyLanguage`**
`setLanguage()` was overwriting tooltip `textContent`, nuking dynamically injected tooltips. Had to restructure so tooltips survive language changes.
`df94650`, `aee91b8`

**Domain rename from ElementaryTimer to GemTimer**
Vercel redirects permanently route `elementarytimer.com` → `gemtimer.com`. CSP headers needed both old and new Clerk domains during the transition.
`50b5188`, `60e6769`

**FOCUS label positioning took 5 commits**
Centering a label in the gap between hero and mode cards on the landing page. Kept nudging margins — up, down, up again — before landing on the right value.
`c039857` → `e11535b`

**Supabase quotes fetch with race condition guard**
`fetchQuotesForTheme()` checks `activeThemeKey` after the async fetch returns. If the user switched themes while the request was in flight, the stale result is discarded.
`0803ef2`

**Supabase JS SDK kept (v2.98.0 pinned) — page freeze was corrupted data, not SDK**
The page freeze was initially attributed to the Supabase JS client, but the actual cause was a corrupted session (192,916 hours) from a cross-device sync bug. The `splitSessionByDay` while loop iterated thousands of times on the bad data, freezing the page. The SDK was temporarily replaced with direct fetch but then restored once the real cause was found. Clerk is unpinned (`@5`), Supabase is pinned to `@2.98.0`.

**`tick()` safety net — kill timer if elapsed > 24h**
If `elapsed` ever exceeds 86400 seconds in `tick()`, the timer is immediately killed (`elapsed = 0, clearInterval, running = false`). This is a last-resort safety net for the cross-device sync — prevents corrupted elapsed values from being saved as sessions. The actual unit mismatch in `resumeNormalFromSync` may still need deeper investigation if it recurs.
`2e29438`

**Corrupted session row from sync bug**
A sync bug saved a session with duration 1,774,493,487 seconds (~192,916 hours) to `timer_history`. It was manually deleted via Supabase dashboard. If abnormal durations appear again, filter `timer_history` for `duration > 86400` to find and delete them.

**Sort comparator NaN causes browser freeze**
The `.sort()` in `loadAndMergeFromSupabase` could produce NaN when comparing invalid dates, causing infinite loops in some browsers (especially Safari/WebKit). All sort comparators must return a valid number — use `|| 0` fallback.
`55f7d01`

**`splitSessionByDay` duration cap at 24 hours**
The `while (cursor < end)` loop in `splitSessionByDay` iterates once per day. Sessions with corrupted durations (millions of seconds) caused the loop to run thousands of iterations, freezing the page. Duration is now capped at 86400s (24h) in the split function.
`400f3d0`

**Sign-out dropdown must be sibling of avatar, not child**
The avatar's `opacity: 0.85` hover transition bleeds into child elements. The sign-out dropdown on both the landing page and Deep Dive overlay must be a sibling of the avatar element, not nested inside it.
`2a8c10c`, `b558f41`

**Date/time centering across pages**
The date/time is centered using `scrollbar-gutter: stable` on `html` (reserves scrollbar space so `left: 50%` computes consistently), nav `padding: 0 40px 10px` matching the app nav, and a mobile override reducing to 20px. This approach is applied to landing, login, and Deep Dive pages.
`dacc7d4`

**Heatmap month label collision detection**
Month labels on the 1y heatmap skip rendering if they'd overlap the previous label (less than ~3 column widths apart). The first partial month at the start of the rolling window is excluded — `lastMonth` is initialized to the first week's month so it's treated as "already seen."
`24b6092`

**Activity suggestions filtered by work type**
`getVisibleNames(workType)` filters session history to only show activity names previously used with the currently selected work type. The `.sustaining` class is toggled on the suggestions list to switch hover tint (orange for Deep Work, charcoal for Sustaining). Switching the toggle immediately updates suggestions.
`e7b183a`

**Work type tooltip border matches pill color**
The `.wt-tooltip` has an orange border/shadow by default (Deep Work). A separate rule on `.work-type-btn[data-type="sustaining"] .wt-tooltip` overrides to charcoal border/shadow.
`4340745`

**Three-column layout — column structure**
`.main` uses flexbox with `align-items: stretch` for full-height dividers. CSS `order` reorders columns visually (HTML order: timer, sessions, stats → visual order: sessions left, timer center, stats right). Timer section is `flex: 1 1 50%` (order: 2), sessions and stats columns are `flex: 0 0 25%` each (order: 1 and 3). Sessions column has no max-height cap — grows naturally. Vertical dividers are `border-right` on sessions column and `border-left` on stats column. Mobile collapses via `flex-direction: column` with order reset (timer first).
`54d7b2a` → `3623fee`

**Mobile landing page optimizations**
Landing clock hidden (`display: none`), landing footer hidden, hero heading shrunk to 16px (matches card headings), CTA button shrunk, nav Sign in / Get started buttons tighter (12px, 5px/10px padding, 6px gap). The `.landing-footer { display: none }` media query must come AFTER the base `.landing-footer` rule in CSS to avoid being overridden.
`645a47b` → `6e6a7f6`

**Orange header line, grey footer line**
Nav uses `nav::after` with `border-bottom: 2px solid var(--orange)` inset 40px each side. Footer uses `.site-footer::before` with `border-top: 1px solid var(--gray-200)` inset 40px. Both are `max-width: 1100px` centered. The `scrollbar-gutter: stable` was removed — it caused a centering mismatch between the main page and the fixed Deep Dive overlay.
`7ef3c9b`, `b97d6b1`

**Page freeze was corrupted data, not Supabase SDK**
The page freeze was caused by a session with duration 1,774,493,487 seconds saved to `timer_history` from a cross-device sync bug. `splitSessionByDay` iterated once per day (~8000 iterations), freezing the browser. The Supabase SDK was temporarily replaced with direct fetch during debugging but restored once the real cause was found. The SDK removal was a red herring.
`400f3d0`

---

**Local dev**
Server runs at `http://localhost:3001/` (`npx serve -l 3001 .`). Clerk uses production keys which don't work on localhost. To bypass sign-in and view the signed-in app locally, paste in DevTools console: `document.querySelector('.main').style.display='block'`. This reveals the authenticated view below the landing page without Clerk auth.

**CSS grid + flex: 1 row-stretch gotcha**
When a CSS grid container has `flex: 1` (filling a flex parent), grid rows stretch to fill available height by default (`align-content: stretch`). If rows need to size to their content, add `align-content: start`. This was the root cause of the Deep Dive overlay gap bug — stat cards overflowed their 48.5px cell because the grid distributed height equally across rows instead of sizing to content. Fixed 2026-04-16.

**iPad Chrome wake-lock: dual-path fix with retry (2026-04-21)**
Screen slept during active timer on iPad Chrome despite Keep Screen On being lit. Two separate root causes.

1. The silent-video fallback was gated on `!hasNativeWakeLock`, so it never ran on iPad Chrome — which exposes `navigator.wakeLock` (so `hasNativeWakeLock` is `true`) but grants it unreliably. Native request intermittently fails with no fallback coverage.
2. iPad Chrome's WKWebView rejects `navigator.wakeLock.request('screen')` with `NotAllowedError` on the first attempt under some conditions, but grants it on an immediate retry. Whatever heuristic underlies the rejection flips quickly.

*Dead end:* Swapping the inline `data:video/mp4;base64` URL for a real `/silent.mp4` file (served by Vercel with correct `Content-Type: video/mp4`, verified via curl) did **not** fix the video fallback on iPad Chrome — `.play()` still rejects with `NotSupportedError` regardless of whether the source is a data URL or a real file. iPad Chrome categorically refuses muted inline video at the codec/container level for wake-lock purposes. The video fallback is effectively dead on iPad Chrome; it only helps on older iOS / non-WKWebView browsers that lack `navigator.wakeLock` entirely.

*Fixes shipped:*
- Always create the silent video element (removed `if (!hasNativeWakeLock)` gate around video creation).
- Moved video inside the viewport (`top:0; left:0` — previously `top:-1px; left:-1px` placed the 1×1 element wholly outside the viewport; WebKit may skip rendering off-viewport elements which could disqualify the video from keeping the screen awake).
- Call `playNoSleepVideo()` in parallel with native Wake Lock on every acquire (not only when `!hasNativeWakeLock`).
- Call `stopNoSleepVideo()` **unconditionally** on release. Without this, on devices where the native API exists, the video starts on timer start but never stops on pause/reset because the old `if (hasNativeWakeLock) { ... } else { stopNoSleepVideo() }` branching skipped the video stop path.
- Added single 200ms retry for `navigator.wakeLock.request('screen')` on `NotAllowedError` specifically. Other error types fall straight through to the existing `console.error` path.
- Kept `/silent.mp4` and the video fallback for older iOS / non-WKWebView browsers.

*Diagnostic approach:* Temporary on-screen debug badge (fixed bottom-right, monospace) showing `wakeLock` support, `sentinel: held/null`, `video: playing/paused`, `currentTime`, and captured `videoErr` / `nativeErr` with full error `name: message`. Essential because iPad Chrome doesn't surface to Safari Web Inspector — third-party iOS browsers are opaque to remote debugging. The badge was removed in the final commit (`dbe8adc`) once the two failure modes were understood.

*Long-term:* Wake Lock reliability on iPad browsers is not fully fixable from the web platform — Apple's WKWebView restrictions on third-party browsers cap what we can do. Native iOS app is the only robust long-term answer.

`ac0785e` (fallback fix), `9b7ffbc` → `994ccbd` (debug badge iterations), `433757c` (silent.mp4 file), `dbe8adc` (retry + cleanup).

---

**Clerk init path must NOT gate on `.loaded` — postmortem 2026-04-23**

Phase 1 of the dev/staging ops work shipped a "readiness guard" that changed the Clerk init poll from `if (window.Clerk)` to `if (window.Clerk?.loaded)`. This looked defensive but caused a **~2-hour production outage**: sign-in on `www.gemtimer.com` stopped working entirely. SDK loaded from the CDN, `window.Clerk` existed, but `.loaded` never flipped to `true` — so the poll never fired `initAuth()`, which is the **only thing that calls `Clerk.load()`** in this codebase. Nothing was driving the async handshake with `clerk.gemtimer.com`, so the SDK sat idle forever and every Sign in button did nothing.

*Diagnostic signal:* Network tab on prod showed `clerk.browser.js` downloaded from `cdn.jsdelivr.net` (SDK present), and zero requests to `clerk.gemtimer.com/v1/*` (no backend handshake). That "SDK present + no backend traffic" pattern means `Clerk.load()` was never invoked.

*Fix:* Separate the init path from the consumer path. The poll fires `initAuth()` as soon as `window.Clerk` exists (independent of `.loaded`). `initAuth()` internally does `await Clerk.load()` — THAT is what flips `.loaded` to true. The modal consumers (`openSignIn`, `openSignUp`) keep the `.loaded` guard so users can't click sign-in before Clerk is ready. One flag, two different jobs.

*Rule for future:* Readiness guards go on the **consumer** (who reads the ready state), never on the **driver** (who makes the ready state true). Don't gate the thing that triggers the load on whether the load has finished.

`acd3b9a` (buggy deploy), `c88dd83` (hotfix).

---

**Never toggle Clerk "Enable allowed subdomains"**

Same 2026-04-23 outage. Clerk Dashboard → Developers → Domains → Allowed Subdomains has a toggle labeled "Enable allowed subdomains". Enabling it flips Clerk into **whitelist mode** — only subdomains explicitly listed can authenticate. We enabled it with only `preseason.gemtimer.com` in the list, which locked out `gemtimer.com` / `www.gemtimer.com` / every other origin.

The toggle's wording ("restrict access to specific subdomains of your configured domains") sounds like it adds allowance, but it removes the default permissive behavior.

*Default state (correct):* toggle OFF, list empty → Clerk accepts any subdomain of the primary domain automatically. This is what you want for `preseason.gemtimer.com` + `www.gemtimer.com` + apex simultaneously.

*Fix:* turn toggle off, clear the list.

`acd3b9a` outage → recovery in same timeline.

---

**Feature flag system (2026-04-23)**

Supabase `feature_flags` table (`key` PK, `enabled` boolean, `updated_at`) — RLS allows public read, writes locked to service_role. App fetches all flags on load via raw `fetch` to Supabase REST (before Clerk initializes, non-blocking). Stored in `window.FLAGS`; `getFlag(key, default=true)` is the only accessor. Fetch failures default features to ON, so a Supabase outage can't silently disable the app.

Five current flags: `carve_outs`, `pomodoro_mode`, `deep_dive`, `supabase_sync`, `clerk_auth`. UI visibility flags hide DOM elements via `applyFlagVisibility()`. `supabase_sync` is guarded at the top of all nine sync functions. `clerk_auth` is guarded in `openSignIn` / `openSignUp` (existing sessions stay functional — the flag only prevents NEW auth). Localhost breaker fixtures (see below) are defensively filtered out of `migrateLocalToSupabase` so they can't leak to cloud.

Flipping flags: `npm run flag:disable <key>` (CLI at `scripts/flag.js`, zero-dep, native fetch, reads `.env.local`). Service role key lives in `.env.local` only; never committed.

`845b60f` (Deploy), Supabase migration `supabase/migrations/20260423_create_feature_flags.sql`.

---

**Wake-lock self-healing watchdog (2026-05-01)**

The 2026-04-21 fix made the dual-path acquire (native Wake Lock + silent `/silent.mp4`) reliable on first start. But iPad Chrome (WKWebView) sometimes silently revokes the native lock or freezes the silent video mid-session — no event fires. The only re-acquire path was `visibilitychange`, so a transient revocation while the tab stayed visible meant the lock was gone for the rest of the session and the screen could sleep with a running timer.

*Fixes shipped (all guarded behind `screenOnActive && running`):*

1. The native `release` listener now self-heals — both acquire sites (main path and `NotAllowedError` retry path) re-call `acquireWakeLock()` after nulling the sentinel. One reacquire only, no loop. If it fails, the existing `console.error` path catches it.
2. New watchdog inside the top-level `tick()` (NOT the landing-trial tick inside `initLandingTryTimer`). Every 5th second of timer-elapsed time it: (a) re-acquires the native lock if `wakeLockSentinel` is null, (b) calls `playNoSleepVideo()` if the silent video paused or its `currentTime` hasn't advanced since the last check, (c) on the second consecutive stuck tick (~10s) it rebuilds `noSleepVideo` from scratch using the same attrs/src as the original creation block and replays. A `stuckVideoStrikes` counter resets to 0 on any successful advance.
3. Added `pageshow` and `resume` listeners that mirror the existing `visibilitychange` re-acquire — covers iOS bfcache restore and WKWebView resume events that don't always fire `visibilitychange`.
4. `playNoSleepVideo` / `stopNoSleepVideo` already reference `noSleepVideo` via closure, so reassigning the variable inside `recreateNoSleepVideo()` keeps the rest of the module pointing at the new element automatically.

*Protected workarounds preserved:* `/silent.mp4` is still a real file (data: URLs reject on iPad Chrome with `NotSupportedError`); the `NotAllowedError` retry path is intact in `acquireWakeLock`; `stopNoSleepVideo()` is still called unconditionally in `releaseWakeLock`; the video element is still positioned at `top:0; left:0` inside the viewport.

*Why a counter and not a separate `setInterval`:* piggybacking on `tick()` means the watchdog only runs while a timer is active, automatically pauses with the timer, and stops when `running` flips false. No extra interval to clean up.

---

**Localhost breaker fixtures (2026-04-23)**

Two console helpers, `seedBreakers()` and `clearBreakers()`, available only on `localhost`/`127.0.0.1`. Seeds ~15 synthetic sessions into `localStorage.et_sessions` tagged `_fixture: 'breaker'`. Covers long names, 10-session-day density, 12h + 1m duration edges, gap days in history bars.

Two layers of isolation so fixtures can't leak:
1. Hostname check on the IIFE — the functions literally don't exist on preseason/prod.
2. `migrateLocalToSupabase` filters `_fixture === 'breaker'` rows before any cloud insert — even if a localhost user signs in with fixtures in localStorage, nothing pushes to cloud.

`09c5eac` (Deploy).

---

**Clerk Development instance parked, not deleted (2026-04-23)**

Attempted to delete the Clerk Dev environment after the staging setup made it redundant. Clerk Hobby plan's Danger Zone only exposes application-level delete ("Delete the application and all associated instances and data"), which would destroy production. There is no per-instance delete option on this tier. Left the Dev instance dormant (no keys wired in the app, no active users beyond a test account) rather than risk misclicking.

If the Dev instance ever becomes useful again, its publishable key is recoverable from the Clerk dashboard. Do NOT propose deleting it again on Hobby — the safe path doesn't exist from the dashboard on that plan.
