'use client';

import { useMemo, useState } from 'react';
import { diffToTarget, findRelation, GUEST_OF_LABEL, membershipOf, N_BASE } from '@/lib/arrange';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { nameValues, primaryName } from '@/lib/names';
import { reportClientError } from '@/lib/report';
import type { CreateRelationInput, Guest, Relation } from '@/lib/types';
import Avatar from './Avatar';
import { ColumnsIcon, GripIcon, UsersIcon } from './icons';

interface ArrangeBoardProps {
  eventId: string;
  guests: Guest[];
  relations: Relation[];
  /** Create one "Guest of" relation (guest → base guest). */
  onAdd: (input: CreateRelationInput) => Promise<void>;
  /** Delete a relation by id. */
  onDelete: (relationId: string) => Promise<void>;
}

/** Just the first name — the board's columns are labelled by side, not full name. */
function firstNameOf(guest: Guest): string {
  return nameValues(guest, 'first')[0] ?? primaryName(guest);
}

/**
 * A simple "which side is this guest on?" board. The event's first two guests
 * are the two sides; every other guest sits in one of three columns — Undecided,
 * <first guest>, or <second guest> — based on their "Guest of" relations.
 * Dragging (or tapping) a card into a column makes that guest a "Guest of" that
 * side exclusively (and clears the other side).
 */
export default function ArrangeBoard({
  eventId,
  guests,
  relations,
  onAdd,
  onDelete,
}: ArrangeBoardProps) {
  const { t } = useTranslation();
  const typeLabel = GUEST_OF_LABEL;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  // The first two guests are the two sides.
  const baseIds = useMemo(() => guests.slice(0, N_BASE).map((g) => g.id), [guests]);
  const baseSet = useMemo(() => new Set(baseIds), [baseIds]);
  // The sides define the columns, so they aren't cards themselves.
  const movable = useMemo(() => guests.filter((g) => !baseSet.has(g.id)), [guests, baseSet]);

  // Undecided + one column per side.
  const columns = useMemo(
    () => [{ key: 'undecided', baseId: null as string | null }, ...baseIds.map((id) => ({ key: id, baseId: id as string | null }))],
    [baseIds],
  );

  // Each movable guest → the column it belongs in (first matching side wins).
  const assignment = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of movable) {
      const mem = membershipOf(g.id, baseIds, relations, typeLabel);
      map.set(g.id, baseIds.find((b) => mem.includes(b)) ?? 'undecided');
    }
    return map;
  }, [movable, baseIds, relations, typeLabel]);

  const moveTo = async (guest: Guest, targetBaseId: string | null) => {
    if (busy) return;
    const current = membershipOf(guest.id, baseIds, relations, typeLabel);
    const target = targetBaseId ? [targetBaseId] : [];
    const { toAdd, toRemove } = diffToTarget(current, target);
    setSelectedId(null);
    if (toAdd.length === 0 && toRemove.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Remove the other side first so re-adding can't 409 on a stale row.
      for (const baseId of toRemove) {
        const rel = findRelation(guest.id, baseId, relations, typeLabel);
        if (rel) await onDelete(rel.id);
      }
      for (const baseId of toAdd) {
        await onAdd({ guestAId: guest.id, guestBId: baseId, typeLabel });
      }
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : String(err);
      reportClientError({ kind: 'arrange-move-failed', eventId, guestId: guest.id, detail });
      setError(err instanceof ApiError ? err.message : t('arrange.moveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onDropInto = (baseId: string | null) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    const guest = id ? guestById.get(id) : undefined;
    if (guest && !baseSet.has(guest.id)) void moveTo(guest, baseId);
  };

  // Tapping a column moves the tap-selected guest there (touch fallback for DnD).
  const onColumnClick = (baseId: string | null) => () => {
    if (!selectedId) return;
    const guest = guestById.get(selectedId);
    if (guest && !baseSet.has(guest.id)) void moveTo(guest, baseId);
  };

  if (guests.length < 2) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-8 text-center"
        data-testid="arrange-empty"
      >
        <ColumnsIcon className="h-8 w-8 text-rose-200" />
        <p className="text-sm text-stone-500">{t('arrange.needGuests')}</p>
      </div>
    );
  }

  return (
    <div data-testid="arrange-board" className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <GripIcon className="h-3.5 w-3.5 shrink-0 text-rose-300" />
        {t('arrange.intro')}
      </p>

      {error && (
        <p className="text-sm text-red-600" data-testid="arrange-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2" role="list">
        {columns.map((col) => {
          const columnGuests = movable.filter((g) => assignment.get(g.id) === col.key);
          const armed = selectedId !== null;
          const base = col.baseId ? guestById.get(col.baseId) : undefined;
          return (
            <section
              key={col.key}
              role="listitem"
              data-testid="arrange-column"
              data-column-key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropInto(col.baseId)}
              onClick={onColumnClick(col.baseId)}
              className={`flex min-h-40 flex-col rounded-xl border bg-stone-50/60 p-2 transition ${
                armed && !busy
                  ? 'cursor-pointer border-rose-300 ring-1 ring-rose-200'
                  : 'border-stone-200'
              }`}
            >
              <h3 className="mb-2 flex items-baseline justify-between gap-1 px-0.5 text-xs font-medium">
                <span className="min-w-0 truncate">
                  {base ? (
                    <bdi className="text-rose-700">{firstNameOf(base)}</bdi>
                  ) : (
                    <span className="text-stone-600">{t('arrange.undecided')}</span>
                  )}
                </span>
                <span
                  data-testid="arrange-column-count"
                  className="shrink-0 rounded-full bg-white px-1.5 text-[10px] text-stone-500"
                >
                  {columnGuests.length}
                </span>
              </h3>
              <ul className="flex-1 space-y-1.5">
                {columnGuests.map((guest) => {
                  const name = primaryName(guest);
                  const selected = selectedId === guest.id;
                  return (
                    <li key={guest.id}>
                      <button
                        type="button"
                        data-testid="arrange-card"
                        data-guest-id={guest.id}
                        draggable={!busy}
                        disabled={busy}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', guest.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDragId(guest.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        onClick={(e) => {
                          // Card click selects (touch move); don't bubble to the column.
                          e.stopPropagation();
                          setSelectedId(selected ? null : guest.id);
                        }}
                        className={`flex w-full items-center gap-1.5 rounded-lg border bg-white px-1.5 py-1.5 text-start shadow-sm transition ${
                          selected
                            ? 'border-rose-400 ring-2 ring-rose-200'
                            : 'border-stone-200 hover:border-rose-200'
                        } ${busy ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
                      >
                        <Avatar name={name} size="sm" />
                        <span className="min-w-0 truncate text-xs font-medium text-stone-900">
                          <bdi>{name}</bdi>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {columnGuests.length === 0 && (
                  <li className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-stone-200 py-3 text-center text-[11px] text-stone-400">
                    <UsersIcon className="h-3.5 w-3.5" />
                    {t('arrange.emptyColumn')}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
