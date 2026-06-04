# WedInvite — Architecture & Plan

A wedding invitation planning platform. Local development only at this stage; designed to
move to **Supabase** (Postgres) + **Vercel** later.

## Core ideas

- **No authentication.** An event is identified by a unique id (UUID). Whoever has the
  link can open it. (Sharing UI is explicitly out of scope for this stage.)
- **Browser localStorage** stores only the list of event ids the user has created/visited
  (key: `wedinvite.eventIds`). All actual data lives in Postgres.
- **Guests have multiple first names and multiple last names** (married name, maiden name,
  nickname…) so the same person isn't added twice under a different name. The UI warns
  about likely duplicates when adding a guest.
- **Relations** link two guests with a typed relationship ("Sister", "Friend"…).
  Built-in presets + user-defined custom types per event.

## Stack

| Layer     | Tech                                              |
|-----------|---------------------------------------------------|
| Frontend  | Next.js (App Router) + React + Tailwind — `web/`  |
| Backend   | NestJS + TypeORM — `api/`                         |
| Database  | PostgreSQL 17 via docker compose (port **54329**) |
| E2E tests | Playwright — `e2e/`                               |

Plain `postgres:17` is used instead of the full Supabase emulator (user marked it
non-critical); the schema uses nothing Supabase-incompatible, so swapping
`DATABASE_URL` to a Supabase connection string later is enough.

## Data model

```
events
  id          uuid pk
  title       text not null
  event_date  date null
  created_at  timestamptz

guests
  id          uuid pk
  event_id    uuid fk → events (cascade)
  phone       text null
  address     text null
  created_at  timestamptz

guest_names                  -- multiple first/last names per guest
  id          uuid pk
  guest_id    uuid fk → guests (cascade)
  kind        'first' | 'last'
  value       text not null
  position    int            -- 0 = primary display name

relation_types             -- user-defined types; presets are constants in the API
  id          uuid pk
  event_id    uuid fk → events (cascade)
  label       text not null  -- unique per event

relations
  id          uuid pk
  event_id    uuid fk → events (cascade)
  guest_a_id  uuid fk → guests (cascade)
  guest_b_id  uuid fk → guests (cascade)
  type_label  text not null  -- denormalized label ("Sister", "Friend", …)
  created_at  timestamptz
```

Notes:
- `type_label` is stored as a string on the relation (simple, robust). The
  `relation_types` table only records the event's *custom* types so they show up as
  options next time; presets live as a constant list in the API.
- Duplicate relations are rejected in either direction (A–B == B–A for same label).
- TypeORM `synchronize: true` for local dev; migrations come later with Supabase.

## API (NestJS, prefix `/api`, port 3001)

```
POST   /api/events                                {title, eventDate?}
GET    /api/events/:id
POST   /api/events/:eventId/guests                {firstNames[], lastNames[], phone?, address?}
GET    /api/events/:eventId/guests
DELETE /api/events/:eventId/guests/:id
GET    /api/events/:eventId/relation-types      → presets ∪ custom
POST   /api/events/:eventId/relation-types      {label}
POST   /api/events/:eventId/relations           {guestAId, guestBId, typeLabel}
GET    /api/events/:eventId/relations
DELETE /api/events/:eventId/relations/:id
```

Posting a relation with an unknown `typeLabel` auto-registers it as a custom type for
the event ("allow the user to add his own").

## Frontend (Next.js, port 3000)

- `/` — create a new event (title + optional date); list of "your events" loaded from
  localStorage ids, details fetched from the API.
- `/events/[id]` — event dashboard, mobile-first single column:
  - Action bar ("Add guest" / "Add relation") + tabs (Guests | Relations) over the lists.
  - Each action expands its own inline form below the action bar (no popups/modals).
    Only one form can be open at a time — while creating a guest the "Add relation"
    and per-card "Connect" buttons are disabled, and vice versa.
  - **Guests panel**: chip-style inputs for multiple first/last names, optional
    phone/address, inline duplicate warning when names match an existing guest.
  - **Relations panel**: opened from the action bar, or from a guest's "Connect" button
    (that guest preselected as side A). Relations read "A is <type> of B".
- Visiting an event page successfully also saves its id to localStorage (that *is* the
  loading mechanism — no sharing UI built).

## Running locally

```bash
docker compose up -d          # postgres on 127.0.0.1:54329
cd api && npm run start:dev   # http://localhost:3001/api
cd web && npm run dev         # http://localhost:3000
cd e2e && npx playwright test # end-to-end tests (needs both servers up)
```
