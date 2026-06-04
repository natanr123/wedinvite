/** Built-in relation type presets, always offered alongside the event's custom types. */
export const PRESET_CONNECTION_TYPES: readonly string[] = [
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
  return PRESET_CONNECTION_TYPES.some((p) => p.toLowerCase() === key);
}
