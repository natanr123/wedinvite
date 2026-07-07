import type { Relation } from './types';

/**
 * How many "base" guests the Arrange board sorts against: the first two guests
 * become the two sides, and every other guest is dropped under one of them (or
 * left Undecided).
 */
export const N_BASE = 2;

/** The relation type the Arrange board defaults to grouping by. */
export const GUEST_OF_LABEL = 'Guest of';

/** Does this relation link guestId and baseId (either direction) with typeLabel? */
function matches(
  relation: Relation,
  guestId: string,
  baseId: string,
  typeLabel: string,
): boolean {
  const sameType = relation.typeLabel.toLowerCase() === typeLabel.toLowerCase();
  if (!sameType) return false;
  const { guestAId: a, guestBId: b } = relation;
  // Order-insensitive, mirroring the API's (a,b)|(b,a) duplicate rule.
  return (a === guestId && b === baseId) || (a === baseId && b === guestId);
}

/** The relation (if any) linking a guest to a base guest by the given type. */
export function findRelation(
  guestId: string,
  baseId: string,
  relations: Relation[],
  typeLabel: string,
): Relation | undefined {
  return relations.find((r) => matches(r, guestId, baseId, typeLabel));
}

/**
 * The base guests this guest is currently "typeLabel" of, in base-id order.
 * This is the guest's column membership.
 */
export function membershipOf(
  guestId: string,
  baseIds: string[],
  relations: Relation[],
  typeLabel: string,
): string[] {
  return baseIds.filter((baseId) => findRelation(guestId, baseId, relations, typeLabel));
}

/**
 * What must change to move a guest from `current` membership to `target`:
 * base ids to add a relation for, and base ids to remove one for.
 */
export function diffToTarget(
  current: string[],
  target: string[],
): { toAdd: string[]; toRemove: string[] } {
  const targetSet = new Set(target);
  const currentSet = new Set(current);
  return {
    toAdd: target.filter((id) => !currentSet.has(id)),
    toRemove: current.filter((id) => !targetSet.has(id)),
  };
}
