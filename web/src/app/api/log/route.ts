import { NextResponse } from 'next/server';

/**
 * Same-origin sink for client error reports (see lib/report.ts).
 * Entries land in this project's Vercel function logs:
 *   vercel logs wedinvite-web.vercel.app
 *
 * Unauthenticated by necessity (it must work even when the API origin is
 * unreachable), so it is deliberately minimal: hard body cap before parsing,
 * a few whitelisted fields logged (not the raw payload), 204 always. Pair
 * with a Vercel WAF rate-limit rule on /api/log for volume protection.
 */
const MAX_BYTES = 4_000;
const FIELDS = ['kind', 'message', 'source', 'status', 'path', 'page', 'ua', 'ts'] as const;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) {
      console.error('[client-log] (rejected: oversized body)', raw.length);
      return new NextResponse(null, { status: 204 });
    }
    const body: unknown = JSON.parse(raw);
    const safe: Record<string, string> = {};
    if (body && typeof body === 'object') {
      for (const field of FIELDS) {
        const value = (body as Record<string, unknown>)[field];
        if (value != null) safe[field] = String(value).slice(0, 500);
      }
    }
    console.error('[client-log]', JSON.stringify(safe));
  } catch {
    console.error('[client-log] (unparseable body)');
  }
  return new NextResponse(null, { status: 204 });
}
