import type { Guest, GuestName } from './types';

function byKind(guest: Guest, kind: 'first' | 'last'): string[] {
  return guest.names
    .filter((n) => n.kind === kind)
    .sort((a, b) => a.position - b.position)
    .map((n) => n.value);
}

/** Primary display name: first first-name + first last-name. */
export function primaryName(guest: Guest): string {
  const [first] = byKind(guest, 'first');
  const [last] = byKind(guest, 'last');
  return [first, last].filter(Boolean).join(' ');
}

/** Every non-primary name (extra first names + extra last names), with stable ids. */
export function aliasNames(guest: Guest): GuestName[] {
  const sorted = (kind: 'first' | 'last') =>
    guest.names
      .filter((n) => n.kind === kind)
      .sort((a, b) => a.position - b.position)
      .slice(1);
  return [...sorted('first'), ...sorted('last')];
}

/**
 * Client-side mirror of the server's guest_name_norm(): unicode-trim + NFKC
 * + lowercase. Display/UX only — the DB constraint is the authority.
 */
function normName(value: string): string {
  return value
    .replace(/^[\s\u00A0\u200B\uFEFF]+|[\s\u00A0\u200B\uFEFF]+$/g, '')
    .normalize('NFKC')
    .toLowerCase();
}

/**
 * Guests that HARD-conflict with the entered names: some (first x last)
 * combination is already claimed (the DB rejects these with 409).
 */
export function findExactDuplicates(
  guests: Guest[],
  firstNames: string[],
  lastNames: string[],
): Guest[] {
  const firsts = new Set(firstNames.map(normName));
  const lasts = new Set(lastNames.map(normName));
  if (firsts.size === 0 || lasts.size === 0) return [];

  return guests.filter((guest) => {
    const guestFirsts = byKind(guest, 'first').map(normName);
    const guestLasts = byKind(guest, 'last').map(normName);
    return (
      guestFirsts.some((v) => firsts.has(v)) && guestLasts.some((v) => lasts.has(v))
    );
  });
}

/**
 * Guests that look like the one being entered: some first name matches and —
 * when both sides have last names — some last name matches too (all
 * case-insensitive). Used for the soft "possible duplicate" warning.
 */
export function findPossibleDuplicates(
  guests: Guest[],
  firstNames: string[],
  lastNames: string[],
): Guest[] {
  const lc = (v: string) => v.trim().toLowerCase();
  const firsts = new Set(firstNames.map(lc));
  const lasts = new Set(lastNames.map(lc));
  if (firsts.size === 0) return [];

  return guests.filter((guest) => {
    const guestFirsts = byKind(guest, 'first').map(lc);
    const guestLasts = byKind(guest, 'last').map(lc);
    const firstMatch = guestFirsts.some((v) => firsts.has(v));
    if (!firstMatch) return false;
    if (lasts.size === 0 || guestLasts.length === 0) return true;
    return guestLasts.some((v) => lasts.has(v));
  });
}
