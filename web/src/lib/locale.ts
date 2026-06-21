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

/** The default language: locale-less paths are redirected here by the proxy. */
export const DEFAULT_LOCALE: Locale = 'he';

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr';
}
