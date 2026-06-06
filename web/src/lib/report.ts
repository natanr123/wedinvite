/**
 * Sends client-side error reports to the SAME-ORIGIN /api/log route (the page
 * origin demonstrably works whenever the app renders, unlike the API origin),
 * where they land in the web project's Vercel function logs:
 *
 *   vercel logs wedinvite-web.vercel.app
 *
 * Best-effort and loop-safe: never throws, dedupes repeated payloads.
 */
const seen = new Set<string>();

export function reportClientError(payload: Record<string, unknown>): void {
  try {
    const key = JSON.stringify(payload).slice(0, 300);
    if (seen.has(key) || seen.size > 50) return;
    seen.add(key);
    void fetch('/api/log', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        page: typeof location !== 'undefined' ? location.href : undefined,
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
        ts: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  } catch {
    // reporting must never break the app
  }
}
