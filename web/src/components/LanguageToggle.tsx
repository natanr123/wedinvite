'use client';

import { useTranslation } from '@/lib/i18n';
import { LOCALES, type Locale } from '@/lib/locale';

const LABELS: Record<Locale, string> = { he: 'עברית', en: 'EN' };

/**
 * Fixed he/en switch. Swaps the leading URL segment, so the language becomes
 * part of the (shareable) URL. Sits at the inline-end corner (right in LTR,
 * left in RTL) via logical `end-3`.
 */
export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className="fixed top-3 end-3 z-50 flex overflow-hidden rounded-full border border-rose-200 bg-white/90 text-xs shadow-sm backdrop-blur"
      data-testid="language-toggle"
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 font-medium transition ${
            locale === code ? 'bg-rose-600 text-white' : 'text-stone-600 hover:bg-rose-50'
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
