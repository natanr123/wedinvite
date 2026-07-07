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
  // Powers the Arrange board; already carries "of", so sentence renderers drop
  // the trailing connector (see labelEndsWithConnector) to avoid "of of".
  'Guest of': 'אורח/ת של',
};

/** Localize a relation type label for display (presets only; others pass through). */
export function localizeRelationType(label: string, locale: Locale): string {
  if (locale === 'he') return HE_PRESET_LABELS[label] ?? label;
  return label;
}

/**
 * True when a (localized) type label already ends with the "of" connector word
 * ("Guest of", "אורח/ת של"), so the directional-sentence renderers shouldn't
 * append the connector again.
 */
export function labelEndsWithConnector(localizedLabel: string, connector: string): boolean {
  const label = localizedLabel.trim().toLowerCase();
  const word = connector.trim().toLowerCase();
  return word !== '' && (label === word || label.endsWith(` ${word}`));
}
