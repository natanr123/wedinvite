# WedInvite

Wedding invitation planning platform — create an event, add guests (with multiple
first/last names to avoid duplicates), and connect guests to each other
("Sister", "Friend", …).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Quick start

```bash
# 1. Database (PostgreSQL 17 on 127.0.0.1:54329)
docker compose up -d

# 2. Backend (NestJS on http://localhost:3001/api)
cd api
npm install
npm run start:dev

# 3. Frontend (Next.js on http://localhost:3000)
cd web
npm install
npm run dev
```

## Tests

```bash
cd e2e
npm install
npx playwright install chromium
npx playwright test        # needs postgres + api + web running
```

## Layout

| Path   | What                          |
|--------|-------------------------------|
| `api/` | NestJS backend + TypeORM      |
| `web/` | Next.js frontend              |
| `e2e/` | Playwright end-to-end tests   |
