/**
 * Loads the message catalogs. Imported only by SERVER code (the [lang] layout
 * + its metadata): both catalogs stay on the server, and just the active
 * locale's dictionary is handed to the client provider as a prop, so the other
 * locale never ships to the browser.
 */
import type { Dictionary } from './i18n-core';
import type { Locale } from './locale';
import en from '@/dictionaries/en.json';
import he from '@/dictionaries/he.json';

const dictionaries: Record<Locale, Dictionary> = { en, he };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
