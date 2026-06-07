# Security

## Reporting a vulnerability

Please open a GitHub issue, or email the maintainer. No bounty — this is a hobby project.

## Threat model & accepted design tradeoffs

WedInvite is a small, single-user-stage wedding planner. A few choices are
**intentional**, not oversights:

- **No authentication — event URLs are capability links.** Anyone with an
  event's UUID can view and edit it. UUIDs are unguessable; there is no
  enumeration (no sequential ids). Don't share an event link with anyone you
  wouldn't let edit the guest list. Capability URLs are kept out of `Referer`
  headers (`Referrer-Policy: no-referrer`) and out of frames
  (`X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`).
- **No PII beyond what the planner types** (guest names, optional phone/address).

## Hardening in place

- **Rate limiting** (`@nestjs/throttler`, production only): 60 req/min/IP
  globally, 10/min/IP on `POST /events` (the one endpoint reachable without a
  capability URL). Trusts `x-forwarded-for` behind Vercel.
- **Request body cap**: 64 kb (`POST /events` etc.); the web `/api/log` sink
  rejects bodies > 4 kb and logs only whitelisted fields.
- **SQL**: all queries parameterized; the hard no-duplicate-guest constraint is
  DB-enforced. DTO validation with `whitelist: true` strips unknown fields.
- **Response headers**: `X-Frame-Options`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, HSTS, and a `frame-ancestors` CSP.
- **Secrets**: `.env*` files are gitignored (only `*.example` templates are
  committed); no credentials in source or git history.

## Known follow-ups (not blocking, documented)

- **Strict `script-src` CSP** is not yet set — Next.js inline hydration scripts
  need per-request nonces via middleware. `frame-ancestors` clickjacking
  protection is in place; the nonce-based script CSP is a planned hardening.
- **DB TLS** uses `rejectUnauthorized: false` (Supabase's pooler presents a
  self-signed chain). The connection is still encrypted; pinning Supabase's CA
  cert (`verify-full`) is the stricter upgrade.
