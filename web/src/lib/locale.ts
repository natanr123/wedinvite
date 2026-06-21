/**
 * Locale primitives, shared by the proxy (server), the [lang] layout (server),
 * and the client i18n hook. Pure — no DOM, no JSON, no React — so it is safe
 * to import from anywhere.
 *
 * The locale lives in the URL ( /he/… , /en/… ): the server knows it at render
 * time, so <html lang/dir> is correct in the first byte (no RTL flash, no
 * hydration mismatch) and a shared link carries its own language.
 */
export const LOCALES = ['he', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** First-visit fallback when the browser asks for neither he nor en. */
export const DEFAULT_LOCALE: Locale = 'he';

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}

/**
 * Pick a supported locale from an Accept-Language header (e.g.
 * "he-IL,he;q=0.9,en;q=0.8"). First supported base language wins; falls back
 * to DEFAULT_LOCALE. Kept tiny on purpose — two locales don't warrant a
 * negotiation library.
 */
export function pickLocaleFromHeader(header: string | null): Locale {
  if (header) {
    for (const part of header.split(',')) {
      const base = part.split(';')[0]?.trim().toLowerCase().split('-')[0];
      if (isLocale(base)) return base;
    }
  }
  return DEFAULT_LOCALE;
}
