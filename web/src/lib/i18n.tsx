'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { formatEventDate } from './format';
import {
  translate,
  translatePlural,
  type Dictionary,
  type TranslateVars,
} from './i18n-core';
import { dirOf, type Locale } from './locale';
import { localizeRelationType } from './relation-labels';

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Holds the active locale + its dictionary (provided by the server [lang]
 * layout). Also keeps <html lang/dir> in sync on soft client navigations
 * between /he and /en — belt-and-suspenders on top of the server-rendered
 * attributes.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  const dir = dirOf(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo<I18nContextValue>(() => ({ locale, dir, dict }), [locale, dir, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within an I18nProvider');
  const { locale, dir, dict } = ctx;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => ({
      locale,
      dir,
      /** Resolve a dot-path key, interpolating {vars}. */
      t: (key: string, vars?: TranslateVars) => translate(dict, key, vars),
      /** Plural key ({one,other}); `n` is injected as the count. */
      tp: (key: string, count: number, vars?: TranslateVars) =>
        translatePlural(dict, key, count, vars),
      /** Localize a relation type label for display (presets only). */
      tType: (label: string) => localizeRelationType(label, locale),
      /** Locale-aware "2027-05-20" → long date. */
      formatDate: (date: string) => formatEventDate(date, locale),
      /** Prefix an app path with the active locale: "/events/x" → "/he/events/x". */
      localePath: (path: string) => `/${locale}${path === '/' ? '' : path}`,
      /** Switch language by swapping the leading URL segment (keeping the query). */
      setLocale: (next: Locale) => {
        const parts = pathname.split('/');
        parts[1] = next;
        const query = searchParams.toString();
        router.push((parts.join('/') || `/${next}`) + (query ? `?${query}` : ''));
      },
    }),
    [locale, dir, dict, pathname, searchParams, router],
  );
}
