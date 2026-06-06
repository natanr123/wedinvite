import { NextResponse } from 'next/server';

/**
 * Same-origin sink for client error reports (see lib/report.ts).
 * Entries land in this project's Vercel function logs:
 *   vercel logs wedinvite-web.vercel.app
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body = '';
  try {
    body = JSON.stringify(await req.json()).slice(0, 4000);
  } catch {
    body = '(unparseable body)';
  }
  console.error('[client-log]', body);
  return new NextResponse(null, { status: 204 });
}
