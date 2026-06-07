# WedInvite API

NestJS + TypeORM backend for [WedInvite](../README.md). PostgreSQL via TypeORM;
public, unauthenticated by design (event UUIDs are capability URLs — see
[../SECURITY.md](../SECURITY.md)).

## Run

```bash
npm install
npm run start:dev          # http://localhost:3001/api  (needs docker compose postgres up)
```

`.env` (local) is the source of truth — copy from `.env.example`. Production
config lives in `.env.prod` (copy from `.env.prod.example`) and is pushed to
Vercel via `../scripts/vercel-env-push.sh`.

## Migrations

```bash
npm run migration:generate -- src/migrations/Name   # from entity changes
npm run migration:run                               # local (.env)
npm run migration:run:prod                          # Supabase session pooler (.env.prod)
```

Local dev may use `DATABASE_SYNC=true`; production schema is migrations-only.

## Endpoints

`/api/events`, `/api/events/:id/guests`, `/api/events/:id/relations`,
`/api/events/:id/relation-types`. See [../ARCHITECTURE.md](../ARCHITECTURE.md).
