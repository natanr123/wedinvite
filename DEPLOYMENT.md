# WedInvite — Deployment Plan (Supabase + Vercel)

Everything is driven by **CLI/API** (no dashboard clicking), and **`.env` files are the
source of truth** — the platforms are push targets, never hand-edited.

## Topology

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  wedinvite-web  │ --> │   wedinvite-api      │ --> │  Supabase Postgres  │
│  Next.js        │     │   NestJS (zero-config│     │  Supavisor pooler   │
│  Vercel project │     │   Fluid Compute fn)  │     │  6543 transaction   │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
```

- **Two Vercel projects, one repo**: `web/` and `api/` each linked as their own project
  (root-directory model). NestJS needs **no vercel.json / adapter** — Vercel detects
  `src/main.ts` and runs the whole app as one function (verified against official docs).
- **Supabase** provides only Postgres at this stage (no auth/storage yet).

## Env-file strategy (source of truth)

| File            | Role                | Loaded by                                  |
|-----------------|---------------------|--------------------------------------------|
| `api/.env`      | local development   | NestJS ConfigModule (only this file)        |
| `api/.env.prod` | production          | **nothing** — pushed to Vercel by script    |
| `web/.env`      | local development   | Next.js dev (built-in `.env` loading)       |
| `web/.env.prod` | production          | **nothing** — pushed to Vercel by script    |

Rules:
- Each file is **complete and standalone** — no fallbacks, no sharing, no inheritance.
- Deliberately named `.env.prod`, **not** `.env.production`: Next.js auto-loads
  `.env.production` during builds, which would silently mix environments. `.env.prod`
  is inert to both frameworks; only the push script reads it.
- At runtime in prod, apps read plain `process.env` injected by Vercel (pushed from the
  file). Locally they read `.env`. The two never meet.
- All `.env*` files are gitignored; committed `.env.example` / `.env.prod.example`
  document the required keys.
- Push script: `scripts/vercel-env-push.sh <dir> <env-file>` — loops the file into
  `vercel env add <KEY> production --force` (stdin, non-interactive, overwrites).
  Re-running it is idempotent. (Bulk alternative: `POST /v10/projects/:id/env?upsert=true`.)

### Production keys

```
# api/.env.prod
DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require   # session mode — migrations only
WEB_ORIGIN=https://<web-prod-domain>

# web/.env.prod
NEXT_PUBLIC_API_URL=https://<api-prod-domain>/api
```

## Database: Supabase specifics (verified)

- **Runtime** connects through the Supavisor pooler in **transaction mode (port 6543)** —
  right for serverless fan-out. Safe with TypeORM: node-postgres doesn't use named
  prepared statements by default (unlike Prisma).
- **Migrations** run against **session mode (port 5432)** — DDL doesn't belong on 6543.
- SSL always on: `?sslmode=require` + `extra.ssl.rejectUnauthorized=false`
  (or bundle the Supabase CA for strict verification later).
- Pool sizing per function instance: `extra: { max: 8, min: 1, idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000 }` (pg pool max is per instance, not global; never 1
  under Fluid Compute).

## Code changes before first deploy

1. **Migrations replace `synchronize`** in prod:
   - `api/src/data-source.ts` (TypeORM CLI datasource, uses `DIRECT_DATABASE_URL`).
   - Generate `InitialSchema` migration from the current entities.
   - `synchronize` becomes env-driven: `DATABASE_SYNC=true` in `api/.env` only.
   - npm scripts: `migration:generate`, `migration:run`, `migration:revert`.
2. **Pool + SSL options** in `app.module.ts` (env-driven, no-ops locally).
3. **CORS**: `WEB_ORIGIN` allow-list in prod (`origin: true` stays for local).
4. `web/.env.local` → `web/.env` (one local file convention everywhere).

## Deploy steps (all CLI)

```bash
# 0. one-time tooling + logins (interactive — run yourself)
npm i -g vercel supabase
vercel login
supabase login            # or export SUPABASE_ACCESS_TOKEN=...

# 1. database
supabase orgs list
supabase projects create wedinvite --org-id <org> --region <region> --db-password <pw>
#    → fill api/.env.prod with the pooler URLs above

# 2. migrate prod schema
cd api && npm run migration:run:prod      # uses DIRECT_DATABASE_URL from .env.prod

# 3. api project
cd api && vercel link --yes               # creates/links wedinvite-api
../scripts/vercel-env-push.sh api api/.env.prod
vercel deploy --prod                      # → https://wedinvite-api.vercel.app

# 4. web project (now that the api URL is known)
#    set NEXT_PUBLIC_API_URL in web/.env.prod
cd web && vercel link --yes
../scripts/vercel-env-push.sh web web/.env.prod
vercel deploy --prod                      # → https://wedinvite-web.vercel.app

# 5. close the loop: set WEB_ORIGIN in api/.env.prod to the web URL,
#    re-push env, redeploy api (env changes need a redeploy)

# 6. smoke test against prod
cd e2e && BASE_URL=https://<web-prod-domain> npx playwright test smoke
```

Later (optional): push the repo to GitHub and connect both Vercel projects to it —
then every push auto-deploys both, and `vercel link --repo` manages them together.

## Notes

- Supabase free tier pauses projects after ~1 week of inactivity (resume from dashboard
  or keep-alive ping).
- localStorage event ids carry over only per browser — visiting an event URL re-saves it
  (already implemented).
- `synchronize:true` must never see the Supabase database — migrations only.
