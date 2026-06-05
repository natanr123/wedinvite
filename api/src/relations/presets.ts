/** Built-in relation type presets, always offered alongside the event's custom types. */
export const PRESET_RELATION_TYPES: readonly string[] = [
  // The couple first — it's a wedding app ("Natan is Fiancé of Efrat").
  'Fiancé',
  'Fiancée',
  'Sister',
  'Brother',
  'Mother',
  'Father',
  'Daughter',
  'Son',
  'Cousin',
  'Aunt',
  'Uncle',
  'Grandmother',
  'Grandfather',
  'Partner',
  'Friend',
  'CoWorker',
  'Neighbor',
];

export function isPresetType(label: string): boolean {
  const key = label.trim().toLowerCase();
  return PRESET_RELATION_TYPES.some((p) => p.toLowerCase() === key);
}
