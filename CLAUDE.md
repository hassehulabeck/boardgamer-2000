# Boardgamer 2000 — notes for Claude

PWA for a lunch-time board game group (~10 people, Gothenburg). Owner: Hans.
**Read `PLAN.md` first**: it holds requirements, design decisions, phases and open
questions. Tick off checkboxes there when work is done, and add new decisions to it.

## Stack
- **SvelteKit 3 + Svelte 5 (runes)**, TypeScript strict, `@sveltejs/adapter-node`
- **Postgres** via **Drizzle ORM** (`drizzle-orm` + `postgres` driver, `drizzle-kit` for migrations)
- Hosted on **Railway**; PWA with manifest + service worker

## SvelteKit 3 gotchas (differs from older docs/training data)
- No `svelte.config.js`: Kit options go in `sveltekit({...})` in `vite.config.ts`.
- Imports use the `#lib/...` alias **with a `.js` extension**: `import { x } from '#lib/players.js'`
  (resolves to the `.ts` file). `$lib` is not used.
- Env vars are declared in `src/env.ts` with `defineEnvVars`, imported from `$app/env/private`
  (server) or `$app/env/public`. `.env` is loaded in dev.
- `browser`, `dev`, `building`, `version` come from `$app/env`.
- `Handle` type comes from `@sveltejs/kit/hooks`.
- Service worker lives in `src/service-worker/index.ts` with its own `tsconfig.json`; it uses
  `$app/manifest` (`immutable`, `assets`) instead of the removed `$service-worker`.
- Remote functions are experimental: use **form actions + `use:enhance`** and `load` functions.
- Node types are enabled in `tsconfig.json` (`"types": ["$app/types", "node"]`).

## Commands
```sh
npm run dev -- --host     # dev server (phones on same Wi-Fi; not on public Wi-Fi with client isolation)
npm run check             # svelte-check — must pass with 0 errors/warnings before deploy
npm run build && npm start
npm run db:generate -- --name <what_changed>   # after editing schema.ts
npm run db:migrate        # apply migrations (uses .env locally)
npm run db:studio
```
Local Postgres (Homebrew, v14) runs on the default socket; dev database is `boardgamer_dev`.
Copy `.env.example` to `.env` on a fresh checkout.

## Code layout
- `src/lib/server/` — server-only: `db/` (schema + client), `auth.ts` (group code, device
  cookie), `players.ts`, `games.ts`, `sessions.ts` (queries/validation), `images.ts`
- `src/lib/format.ts` — all date/time display in `Europe/Stockholm`, plus `stockholmTime()`
  for turning a Swedish wall-clock time into a Date
- `src/lib/` — shared: `players.ts` (types, avatar URLs), `colors.ts`, `image.ts` (client-side
  resize), `picker.ts`; components in `src/lib/components/`
- `src/hooks.server.ts` — loads device/player into `locals` and guards all routes
  (no device → `/join`, no player → `/welcome`)
- Migrations in `drizzle/` — generated, committed, **never edited after they've been deployed**

## Code style
- Tabs, single quotes, semicolons, ~100-char lines (as in the existing files).
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `onclick=`); no stores or `export let`.
- Comments are short and explain *why*, not what. Doc comments (`/** */`) on exported helpers.
- Server validation is the source of truth; return `fail(400, { error })` with a friendly message.
- Never select image bytes in list queries — use `summaryColumns` / `toSummary`.
- Styling: scoped `<style>` per component; theme tokens and shared classes (`.page`, `.field`,
  `.button`, `.error`, `.muted`) live in `src/routes/+layout.svelte`. Dark theme only.
- Mobile first: max-width 480px pages, 16px side padding, `env(safe-area-inset-*)`,
  inputs ≥16px font (stops iOS zoom), touch targets ≥44px.
- UI text is in English, friendly and short.

## Data conventions
- UUID primary keys, `timestamptz` stored in UTC; group by date/weekday in `Europe/Stockholm`.
- Images: resized on the phone (`resizeToSquareJpeg`, 256px JPEG) and stored as `bytea`, served
  from versioned URLs (`?v=<updatedAt>`) with immutable caching.
- Identity: the device cookie `bg_device` holds a random token; only its SHA-256 is stored.
  One player can have several devices (iOS home-screen app has storage separate from Safari).

## Deploy (Railway)
- Project `boardgamer-2000` (id `3b9e1459-dea6-4bef-9e0f-5004572eac39`), environment
  `production`, services `web` (the app) and `Postgres`.
- URL: https://web-production-56a0d.up.railway.app
- Deploy: `railway up --service web --detach -m "<summary>"`, then poll
  `railway deployment list --service web --json` until the new deployment is `SUCCESS`, then
  smoke-test with curl. Never report a deploy as done before seeing `SUCCESS`.
- The pre-deploy step `npm run db:migrate` is set on the service itself
  (`railway environment edit --json`, `deploy.preDeployCommand` is an array). A `railway.json`
  in the repo is **not** picked up by `railway up`, so don't rely on one.
- Variables on `web`: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `GROUP_CODE`.
- Postgres has no public URL (private network only). Both services run in
  `europe-west4-drams3a` (Netherlands).
- One-off production queries: `railway ssh --service web`, pass a small Node script
  (base64-encoded to survive quoting) and run it with `NODE_PATH=/app/node_modules`. Read
  before writing, and only change production data when Hans has asked for it.
- Builds take ~5–10 minutes. Hans is on the Hobby plan and cost-conscious: don't add services
  without asking.

## Testing
- Run `npm run check`, then exercise flows against a dev server with curl (form actions accept
  `-H 'x-sveltekit-action: true' -H 'accept: application/json' -H 'origin: <url>'`).
- Screenshots at phone size: install `playwright-core` in the scratchpad (not the project),
  launch the system Chrome (`/Applications/Google Chrome.app/...`) with a 390×844 viewport, and
  add the `bg_device` cookie from a curl cookie jar to get past `/join`. Plain headless Chrome
  can't go below 500px wide.
- Multi-touch (finger picker) can only be tested on a real phone; ask Hans.

## Git
The repo is initialized. Commit only when Hans asks.
