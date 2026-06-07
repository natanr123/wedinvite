# WedInvite Web

Next.js (App Router) + Tailwind frontend for [WedInvite](../README.md).
Mobile-first; talks to the API at `NEXT_PUBLIC_API_URL`.

## Run

```bash
npm install
npm run dev               # http://localhost:3000  (needs the API running)
```

Copy `.env.example` → `.env` for local config. Production config lives in
`.env.prod` (copy from `.env.prod.example`), pushed to Vercel via
`../scripts/vercel-env-push.sh`.

## Notes

- Event ids are kept in `localStorage`; all data lives in the API/DB.
- On-device debug overlay (console/network) is opt-in: append `?debug=1`.

See [../ARCHITECTURE.md](../ARCHITECTURE.md) for the full design.
