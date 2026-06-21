# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

WedInvite is a three-tier wedding guest-list app in one repo: `web/` (Next.js 16 App Router + React 19 + Tailwind v4, port 3000) calls `api/` (NestJS 11 + TypeORM 0.3, all routes under prefix `/api`, port 3001), which owns all persistence in PostgreSQL. There is **no authentication by design** — an event is a UUID capability link; whoever holds the `/events/<uuid>` URL can view and edit it. The browser's `localStorage` only remembers which event ids this browser created/visited; all real data lives in the API/DB. Locally Postgres runs in Docker; in production the API and web are two separate Vercel projects fronting a Supabase-hosted Postgres.

## Common commands

### Local DB / Docker (run from repo root)

```bash
docker compose up -d   # Postgres 17 on 127.0.0.1:54329 -> container 5432 (user/pw/db all 'wedinvite')
```

Postgres must be running for the API, e2e tests, and migrations. If you change host port `54329`, also update `DATABASE_URL` in `api/.env` and any e2e expectations.

### api/ (NestJS, port 3001)

```bash
npm install                 # from api/
npm run start:dev           # watch dev server on PORT (default 3001), serves /api/...
npm run build               # nest build (wipes dist/)
npm run lint                # eslint --fix
npm run format              # prettier --write
npm test                    # jest (NOTE: no *.spec.ts files exist yet, so this matches nothing)
npm run test:e2e            # jest --config ./test/jest-e2e.json (test/app.e2e-spec.ts)
```

Run a single jest test (config is inlined in `package.json`, rootDir `src`):

```bash
npx jest src/guests -t "conflict"   # path/regex + optional -t to filter by test name
```

Migrations (run from `api/`):

```bash
npm run migration:run            # LOCAL docker postgres (.env)
npm run migration:run:prod       # PROD Supabase via DIRECT_DATABASE_URL session pooler (.env.prod)
npm run migration:generate       # generate from entity diff; also migration:revert[:prod]
```

Even with `DATABASE_SYNC=true` locally you **must** run `migration:run` once — `guest_name_pairs` and the `guest_name_norm()` function are migration-only, and guest create/update fails without them.

### web/ (Next.js, port 3000)

```bash
npm install        # from web/
cp .env.example .env
npm run dev        # plain `next dev` (NOT turbopack) on http://localhost:3000; needs the API running
npm run build      # next build
npm run start      # next start
npm run lint       # bare eslint (flat config)
```

`web/` has its own per-directory `web/CLAUDE.md` (which `@`-includes `web/AGENTS.md`). **Read those before writing any Next.js code in `web/` — this is Next.js 16, which has breaking changes vs older training data; the rule is to consult `node_modules/next/dist/docs/` first.**

### e2e/ (Playwright, chromium only)

```bash
cd /home/natan/workpy/wedinvite/e2e && npm install && npx playwright install chromium   # first time
npx playwright test                                # all tests (npm test); needs docker postgres up
npx playwright test tests/wedinvite.spec.ts        # single spec (only spec file)
npx playwright test -g "requires at least one first name"   # single test by title
```

`playwright.config.ts` `webServer` auto-starts both api (`../api` `npm run start:dev`) and web (`../web` `npm run dev`) with `reuseExistingServer:true`, but Postgres must already be running.

### Vercel env (env files are the source of truth)

```bash
/home/natan/workpy/wedinvite/scripts/vercel-env-push.sh api api/.env.prod production
```

Pushes an env file to a linked Vercel project via `vercel env add --force` (idempotent). Vercel/Supabase dashboards are never hand-edited.

## Architecture

**No-auth capability model (web + api + db).** No login anywhere. The event UUID *is* the capability. On the client, `web/src/lib/storage.ts` keeps a single `localStorage` key `wedinvite.eventIds` (array of UUIDs, most-recent-first); it is written on event create and on every successful event load, and an id is removed when the API returns 404/400. The home page (`web/src/app/page.tsx`) rebuilds "Your events" by `getEvent`-ing each saved id. Capability URLs are kept out of `Referer` (`Referrer-Policy: no-referrer`) and frames (`X-Frame-Options: DENY`). All client storage access is `try/catch`-guarded and survives privacy-mode browsers that deny storage entirely (an inline ES5 shim in `layout.tsx` installs an in-memory stand-in plus an early-error trap).

**How web talks to api.** Every API call goes through `web/src/lib/api.ts`: base URL `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`), a single `request<T>()` helper using `fetch` with `cache:'no-store'`, throwing a typed `ApiError(status, message, details)`. Endpoints are all keyed by `eventId` in the path. Page routes are client components that fetch on mount (no RSC data layer). The event workspace (`web/src/app/events/[id]/page.tsx`) is the orchestrator: it holds a `Status` state machine, a `PanelState` union enforcing "one action at a time," and does **one silent 1.5s retry** on load before surfacing an error (covers serverless cold starts / flaky mobile networks). Client errors are reported to the same-origin `POST /api/log` sink (`web/src/app/api/log/route.ts`), which is reachable even when the API origin is not.

**Internationalization (he/en + RTL).** The web app is bilingual Hebrew/English using the official Next 16 App Router pattern: a `[lang]` URL segment (all pages under `web/src/app/[lang]/`) plus `web/src/proxy.ts` (Next 16 renamed `middleware`→`proxy`) which redirects any locale-less path to `/he` or `/en` by `Accept-Language` (default **he**). The server `[lang]/layout.tsx` resolves the locale from the awaited `params`, sets `<html lang/dir>` (so RTL is correct in the first byte — no flash/hydration mismatch), and `getDictionary(lang)` (`web/src/lib/dictionary.ts`, the only module that imports the JSON catalogs) passes just the active locale's catalog into a client `I18nProvider`. Client code calls `useTranslation()` (`web/src/lib/i18n.tsx`) → `t()`, `tp()` (plural), `tType()` (preset label display), `formatDate()`, `localePath()`, `setLocale()`. **All copy lives in `web/src/dictionaries/{en,he}.json` (identical key sets) — the single source of truth; the NestJS API stays language-agnostic** (it returns data + canonical English preset labels, which the web maps to Hebrew for *display only* via `web/src/lib/relation-labels.ts` while storing the canonical label). Pure lookup (`web/src/lib/i18n-core.ts`) and locale primitives (`web/src/lib/locale.ts`) carry no JSON so the inactive locale never reaches the client bundle. RTL is nearly CSS-free (the layout is flex/`gap`/`justify`); the only specifics are the Hebrew fonts (Heebo + Frank Ruhl Libre in `layout.tsx` + `globals.css`), two mirrored glyphs (`rtl:-scale-x-100`), and `<bdi>` around user data (names/phone/address/titles) so mixed-script text doesn't reorder.

**API request flow.** `api/src/main.ts` bootstraps with global prefix `api`, a 64kb JSON body limit, `Cache-Control: no-store` + ETag disabled on every response (live data; avoids mobile-browser 304 failures), `trust proxy=1`, CORS from the `WEB_ORIGIN` allow-list (any origin when unset), and a global `ValidationPipe({whitelist:true, transform:true})`. Per feature: Controller (UUIDs via `ParseUUIDPipe`, body via class-validator DTOs) → Service (TypeORM repositories). Routes nest under the event: `/api/events`, `/api/events/:eventId/guests`, `/api/events/:eventId/relations`, `/api/events/:eventId/relation-types`; `GET /api` is the health check. Guests and Relations call `eventsService.ensureExists(eventId)` (404 if missing) before acting.

**Data model (5 tables) centered on guest-name uniqueness.** `events` → `guests` (CASCADE) → `guest_names` (`kind` `'first'|'last'`, `value`, `position`; position 0 is the primary display name). A guest needs ≥1 first **and** ≥1 last name (DTO 1–10 each). The central invariant lives in `guest_name_pairs` (`event_id, first_norm, last_norm, guest_id`) whose **PRIMARY KEY `(event_id, first_norm, last_norm)` is the hard "no duplicate guest" constraint**: within one event no two guests may share *any* normalized (first × last) combination. On create/update the service materializes the full cartesian product of normalized first × last names into this table. A composite FK `(event_id, guest_id) → guests(event_id, id)` (backed by `UQ_guests_event_id_id`) keeps pairs rows from referencing a guest in another event. PATCH a guest is a **full replacement** of names + phone + address. This table and the normalization function are SQL-only (`synchronize:false` on the `GuestNamePair` entity); they exist only in migration `AddGuestNamePairs1780620000000`.

**Normalization is SQL-only.** The single normalization authority is the Postgres function `guest_name_norm(text)` = unicode-trim (strips ASCII whitespace + NBSP + zero-width + BOM) + NFKC + `lower()`, `IMMUTABLE STRICT`. It is used by the insert path, the pre-check query, and the migration backfill. **JS never computes norms** (avoids JS-vs-Postgres NFC/NFD/case-fold/NBSP divergence that would silently bypass the PK). The client mirror in `web/src/lib/names.ts` is UX-only; the DB constraint (server returns 409 with `conflictingGuestName`) is the authority.

**Relation domain model (directional).** A relation reads "**guestA is `<type_label>` of guestB**" — `guest_a_id` is the subject, `guest_b_id` the object, `type_label` the denormalized role (e.g. "Natan is Fiancé of Efrat"). Order is semantically meaningful, but **duplicate detection is order-insensitive**: an existing `(A,B)` or `(B,A)` with the same `type_label` (case-insensitive) is rejected. Relation types are split: built-in **presets are hard-coded in `api/src/relations/presets.ts`** (Fiancé, Fiancée, Sister, Brother, Mother, Father, … Friend, CoWorker, Neighbor) and are **not** stored in the DB; only per-event **custom** types live in `relation_types` (`UNIQUE(event_id,label)`). `addType()` is idempotent and case-insensitive (a preset-matching label returns the canonical preset and is not stored); creating a relation auto-registers its `typeLabel`; `listTypes` returns `{presets, custom}`.

## Key constraints & conventions

- **⚠️ This is a PUBLIC repository — be extra careful never to commit secrets.** No real API keys, tokens, DB passwords, or connection strings may ever enter the repo or git history. Only the `*.env.example` / `*.env.prod.example` templates (placeholders only) are committed; the real `api/.env`, `web/.env`, `api/.env.prod`, `web/.env.prod` and the DB password file under `tmp/` are gitignored and must stay that way. `.gitleaks.toml` scans for leaks (its allowlist is only a dummy scaffold token + `*.example` + `package-lock.json`); never widen the allowlist to silence a real secret. Before staging, double-check no credential is being added — when in doubt, leave it out and reference an env var instead.
- **No two guests in an event may share any first × last name combination.** Enforced in the DB by the `guest_name_pairs` PK using `guest_name_norm(text)` as the single normalization authority — implemented in SQL only, never reimplemented in JS. The API reports conflicts twice: a friendly pre-check 409 naming the existing guest, and a race-proof retry on Postgres `23505` (same `23505` pattern guards `relation_types.label`). Guests need ≥1 first and ≥1 last name; client-side dup detection is UX only.
- **The domain term is "relation," not "connection."** Use "relation"/"relation type" everywhere (entities, services, routes, UI). Relations are directional ("A is `<type>` of B") with order-insensitive duplicate prevention.
- **No authentication, by design** (see `SECURITY.md`). The event UUID is an unguessable capability link; there is no sharing UI (visiting the URL is what saves the id). Do not add auth assumptions. Storage failures must never break the app.
- **Env files are the source of truth; dashboards are push targets, never hand-edited.** `api/.env` + `web/.env` = local (auto-loaded), copied from `*.env.example`. `api/.env.prod` + `web/.env.prod` = production, loaded by **nothing** at runtime — only `scripts/vercel-env-push.sh` reads them and pushes to Vercel, where the apps then read injected `process.env`. Each file is complete and standalone. The prod file MUST be named `.env.prod`, **never `.env.production`** (Next.js would auto-load that and mix environments). Only committed env files are the `*.example` templates.
- **Supabase pooler port discipline.** Runtime connects via `DATABASE_URL` through the transaction pooler on **:6543** (right for serverless; safe because node-postgres doesn't use named prepared statements). Migrations/DDL connect via `DIRECT_DATABASE_URL` through the session pooler on **:5432**. Never run DDL on 6543; never point runtime at 5432.
- **TLS via `DATABASE_SSL=true`** (sets `ssl.rejectUnauthorized=false`). Do **not** add `sslmode=require` to the URL — pg would then enforce CA verification and fail against Supabase's pooler cert chain. Connection is still encrypted.
- **`synchronize` is local-dev only**, driven by `DATABASE_SYNC=true`. It must **never** touch the Supabase database — production schema is migration-managed only (`DATABASE_SYNC` unset/≠`true`).
- **Do not "optimize" caching back on.** `no-store` on HTML/API responses (both `api/src/main.ts` and `web/next.config.ts`, and `cache:'no-store'` in `web/src/lib/api.ts`) is deliberate — some mobile browsers mishandle 304 revalidation and serve stale bundles. `web/next.config.ts` keeps `/_next/` hashed assets cacheable.
- **Throttling** (`api/src/app.module.ts`): global 60 req/min/IP, `POST /api/events` tightened to 10/min/IP; the `ThrottlerGuard` is registered **only when `NODE_ENV==='production'`** (local dev and e2e bypass it; `@Throttle` decorators remain as documentation).

For deeper detail see `ARCHITECTURE.md`, `DEPLOYMENT.md`, and `SECURITY.md` at the repo root.
