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
