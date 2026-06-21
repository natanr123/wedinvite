import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALES, pickLocaleFromHeader } from '@/lib/locale';

/**
 * Locale routing (the Next.js 16 App Router i18n pattern; `middleware` is now
 * `proxy`). Any path without a /he or /en prefix is redirected to one chosen
 * from Accept-Language, so the server always renders the correct <html
 * lang/dir>. A shared, locale-less capability link (e.g. /events/<uuid>) is
 * redirected gracefully to the visitor's language.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = pickLocaleFromHeader(request.headers.get('accept-language'));
  request.nextUrl.pathname = `/${locale}${pathname}`;
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
