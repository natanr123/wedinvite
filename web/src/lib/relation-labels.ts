import type { Locale } from './locale';

/**
 * Display-only Hebrew labels for the API's built-in relation presets. The
 * canonical English label (from api/src/relations/presets.ts) stays the stored
 * identifier — a relation created in Hebrew still reads correctly in English,
 * and vice-versa — so this map is consulted ONLY when rendering. Custom,
 * user-typed types are shown verbatim (they're the user's own words).
 *
 * Keys must match the API preset labels exactly.
 */
const HE_PRESET_LABELS: Record<string, string> = {
  Fiancé: 'ארוס',
  Fiancée: 'ארוסה',
  Sister: 'אחות',
  Brother: 'אח',
  Mother: 'אמא',
  Father: 'אבא',
  Daughter: 'בת',
  Son: 'בן',
  Cousin: 'בן/בת דוד',
  Aunt: 'דודה',
  Uncle: 'דוד',
  Grandmother: 'סבתא',
  Grandfather: 'סבא',
  Partner: 'בן/בת זוג',
  Friend: 'חבר/ה',
  CoWorker: 'עמית/ה לעבודה',
  Neighbor: 'שכן/ה',
};

/** Localize a relation type label for display (presets only; others pass through). */
export function localizeRelationType(label: string, locale: Locale): string {
  if (locale === 'he') return HE_PRESET_LABELS[label] ?? label;
  return label;
}
