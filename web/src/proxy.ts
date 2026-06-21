import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/locale';

/**
 * Locale routing (the Next.js 16 App Router i18n pattern; `middleware` is now
 * `proxy`). Hebrew is the default: any path without a /he or /en prefix is
 * redirected to /he regardless of the browser's Accept-Language. English stays
 * one click away (the header toggle) or directly via an /en URL. A shared,
 * locale-less capability link (e.g. /events/<uuid>) therefore opens in Hebrew.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  request.nextUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  /**
   * Skip Next internals, the same-origin /api/log error sink (must stay at
   * /api/log — never localized), and any file with an extension (favicon,
   * svgs, etc.). Everything else gets a locale prefix.
   */
  matcher: ['/((?!api(?:/|$)|_next(?:/|$)|.*\\..*).*)'],
};
