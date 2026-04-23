---
name: code-standards-audit
description: Audit a Gemka repo against the three code standards established 20 April 2026 (no silent fallbacks on external data, Pino for server logging, every API endpoint needs a documented trigger). Trigger when the user asks to "run the code standards audit", "audit this repo", "check code standards", or references the Gemka audit playbook. Also trigger proactively when the user is preparing a production deploy that touches API routes, data transforms, or auth.
---

# Code Standards Audit

Run a three-rule audit against this repo. Do not install packages, edit code, or commit anything until the user has reviewed findings and explicitly approved fixes.

## Step 1 — Confirm context before starting

Before auditing, establish and report to the user:
- Current branch (`git branch --show-current`). If on `main`, stop and ask the user to switch to `dev` first. Per Gemka convention, audit work lands on `dev`.
- Relevant excerpts from this repo's `CLAUDE.md` — specifically any protected workarounds, exempt patterns, or per-repo conventions that override the defaults below.
- Stack type: Next.js app with API routes, static site, or other. This determines how the rules translate.

If the repo's stack doesn't map cleanly to one or more rules (e.g. static site with no API endpoints, no Node logger possible, no DTOs), propose a translation that preserves the rule's intent before auditing. Do not force a rule onto a stack where it doesn't apply literally.

## Step 2 — Audit each rule

### Rule 1 — No silent fallbacks on external data

Search for `?? 0`, `?? ''`, `?? false`, `?? []`, `|| 0`, `|| ''`, `|| false`, `|| []` in any location where external data (Supabase rows, API responses, webhook payloads, localStorage values) is being transformed into a typed interface or app state.

For each occurrence, report:
- File and line
- Field name being defaulted
- The external source (which table, which API)
- Whether it's documented as a protected workaround in `CLAUDE.md`

Do not flag fallbacks on locally-computed values, accumulator patterns (`dayMap[k] || 0`), or NaN guards unless they read from external data.

### Rule 2 — No stray `console.*` in server code

List every `console.log`, `console.warn`, `console.error` in the codebase. Split into:
- **Server-side** (API routes, webhooks, lib modules imported by server code, cron handlers, scripts) — must migrate to Pino with `pino({ name: 'moduleName' })` prefix.
- **Client-side** (React components, browser-only code, static HTML inline scripts) — exempt. Pino is not worth bundling into the browser.

For server-side violations, report file, line, and proposed module name for the Pino logger.

For any `console.*` with an adjacent comment explaining why it's intentional (e.g. Easter eggs, dev-exposed debug hooks), note it as documented-intentional and do not flag.

### Rule 3 — Every API endpoint has a documented trigger

List every route under `src/app/api/` (or the repo's equivalent). For each, identify the trigger category:
- (a) Client fetch call — grep for `fetch('/api/...)` across the codebase
- (b) Vercel cron — check `vercel.json`
- (c) External webhook — must have a header comment documenting registration location (e.g. "Clerk dashboard") and trigger event (e.g. "user.created")
- (d) Written justification in a header comment

Flag any endpoint that falls into none of these categories. Also flag any endpoint in category (c) whose header comment is missing or incomplete.

## Step 3 — Before proposing fixes for Rule 1

For any field the audit suggests throwing on, schema-check before recommending the throw:
- Read the migration file if one exists in the repo.
- If no migration file exists, ask the user to run this query in Supabase against the relevant table:
  ```sql
  SELECT COUNT(*) FILTER (WHERE <field> IS NULL) AS null_<field>, COUNT(*) AS total FROM <table>;
  ```
- Only recommend a throw if the field is either NOT NULL by schema or has zero nulls across the whole table in practice.
- For fields that are legitimately nullable, recommend typing the TypeScript interface as optional (`field: string | null`) and removing the fallback, rather than throwing.

## Step 4 — Report findings and stop

Return to the user:
1. Three violation lists, one per rule, with the details above.
2. Any stack-translation notes from Step 1.
3. A recommended order of operations for fixes (typically Rule 3 first — trivial, then Rule 2 — mechanical, then Rule 1 — requires judgment and schema checks).
4. Any protected workarounds or exempt patterns found in `CLAUDE.md` that affected the audit.

Do not begin fixes. Ask the user to review the findings and confirm which rules and which violations to address.

## Step 5 — After user approval, fix in order

For each rule the user approves:
- Make the changes.
- Show a diff summary before committing.
- Commit to `dev` (never `main`) with a clear message.
- Do not push until the user confirms.

When merging to `main`, follow the repo's deploy convention — typically `git merge --no-ff dev -m "Deploy: <summary>"` per Gemka's CLAUDE.md. Check the repo's CLAUDE.md for the exact merge convention before proceeding.

## Red flags — escalate immediately if found

- Any public/unauthenticated endpoint that reads from or writes to a database. Reference: McKinsey Lilli breach (March 2026) — 22 unauthenticated endpoints enabled a 2-hour SQL injection breach. Rule 3 is the direct defense.
- API routes with no caller anywhere in the codebase — either dead code (recommend deletion, preserved in git history) or undocumented webhook (recommend justification comment).
- Silent `|| 0` or `|| ''` on fields that feed analytics, billing, or displayed user data. Corrupted data without alerts is worse than a visible error.
- Logging that mixes `console.log` and a structured logger in the same module — means a prior migration is incomplete.

## Notes on verification

Some Gemka repos cannot be tested locally:
- GemTimer: Clerk blocks localhost; use the DevTools console bypass documented in CLAUDE.md, or test on a Vercel preview deploy.
- IdeaKache with Next.js 16: Turbopack first-compile can hang; if it does, accept the next scheduled cron run or Vercel preview as the real-world test rather than blocking on local startup.

When local testing isn't feasible, surface this to the user and offer Vercel preview deploy as the verification path. Do not silently skip verification.
