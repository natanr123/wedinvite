import type { Locale } from './locale';

/**
 * "2027-05-20" → "May 20, 2027" (en) / "20 במאי 2027" (he).
 * Timezone-safe: parses as UTC, formats as UTC.
 */
export function formatEventDate(date: string, locale: Locale = 'en'): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  const tag = locale === 'he' ? 'he-IL' : 'en-US';
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(tag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
