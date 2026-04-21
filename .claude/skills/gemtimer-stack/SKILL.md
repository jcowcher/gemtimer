---
name: gemtimer-stack
description: Use when editing index.html or privacy.html in the GemTimer repo (gemtimer.com). GemTimer is a vanilla HTML/CSS/JS single-page site — NOT Next.js, NOT React, NOT a framework. Prevents defaulting to framework assumptions from other Gemka products.
---

# GemTimer stack — read before editing

GemTimer is a **single-file vanilla HTML/CSS/JS** site at gemtimer.com. The entire app lives in `index.html` (~6,900 lines). No framework, no build step, no package.json, no node_modules.

## The stack (complete list)

- HTML5 + modern evergreen-browser JS (ES2020+, async/await, optional chaining — no transpilation, no IE/old-Safari floor)
- Vanilla CSS inside a single `<style>` block in `index.html`
- Clerk.js v5 loaded from CDN via `<script>` tag
- Supabase JS v2.98.0 loaded from CDN via `<script>` tag
- Hosted on Vercel (static — no serverless functions, no edge runtime)

That is the entire dependency list. Nothing else.

## Never suggest without asking first

- React / Vue / Svelte / any framework
- A bundler (Vite, webpack, esbuild, Rollup, Parcel)
- Migrating to Next.js
- `npm install` anything / creating a `package.json`
- TypeScript
- A CSS framework (Tailwind, Bootstrap, etc.)
- Splitting `index.html` into multiple files
- Extracting CSS to a separate `.css` file
- Extracting JS to separate `.js` modules or using ESM `import`

If a task seems to require any of the above, stop and ask before proposing it.

## Patterns from other Gemka products that DO NOT apply

The other Gemka products are Next.js App Router apps. **None** of the following apply to GemTimer:

- `@supabase/ssr`, server-side Supabase clients, cookie-based auth — GemTimer uses `supabase-js` browser client only
- Clerk middleware (`middleware.ts`), `auth()` server helpers, mounted `<SignIn />` component — GemTimer uses a custom sign-in form with the Clerk browser SDK
- Server components, `'use client'`, App Router, route handlers, API routes
- TypeScript types, `.ts`/`.tsx` files
- Tailwind utility classes, shadcn/ui components
- ESM `import` / `export`, `tsconfig.json`
- Any `npm`/`pnpm`/`yarn` command

If you catch yourself reaching for any of these, you are in the wrong mental model.

## Styling rule

All CSS lives in the `<style>` block inside `index.html`. Do not create separate `.css` files.

## Scope

Triggers on edits to `index.html` or `privacy.html`. Out of scope: `supabase/migrations/*.sql`, `vercel.json`, `robots.txt`, `sitemap.xml`.
