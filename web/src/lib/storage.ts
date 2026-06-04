/**
 * The browser's localStorage only remembers *which* events this browser has
 * created or visited (no auth in this stage); all actual data lives in the API.
 */
const KEY = 'wedinvite.eventIds';

export function getSavedEventIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveEventId(id: string): void {
  if (typeof window === 'undefined') return;
  const ids = getSavedEventIds().filter((existing) => existing !== id);
  ids.unshift(id); // most recent first
  window.localStorage.setItem(KEY, JSON.stringify(ids));
}

export function removeEventId(id: string): void {
  if (typeof window === 'undefined') return;
  const ids = getSavedEventIds().filter((existing) => existing !== id);
  window.localStorage.setItem(KEY, JSON.stringify(ids));
}
