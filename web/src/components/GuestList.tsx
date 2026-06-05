'use client';

import { useState } from 'react';
import { aliasNames, primaryName } from '@/lib/names';
import type { Guest, Relation } from '@/lib/types';
import Avatar from './Avatar';
import { LinkIcon, MapPinIcon, PhoneIcon, UsersIcon } from './icons';

interface GuestListProps {
  guests: Guest[];
  relations: Relation[];
  onDelete: (id: string) => Promise<void>;
  /** Opens the "add relation" panel with this guest preselected as side A. */
  onConnect: (guest: Guest) => void;
  /** Opens the edit panel for this guest (clicking the card body). */
  onEdit: (guest: Guest) => void;
  /** True while the "add guest" form is open — one action at a time. */
  actionsDisabled?: boolean;
}

const MAX_RELATION_CHIPS = 3;

/**
 * The guest's relationships, phrased correctly from their point of view.
 * A relation means "A is <type> of B", so on A's card it reads
 * "<type> of <B>" and on B's card "<type>: <A>" (e.g. "Mother: Dana"
 * = my mother is Dana).
 */
function relationsOf(guest: Guest, relations: Relation[]) {
  return relations
    .filter((r) => r.guestAId === guest.id || r.guestBId === guest.id)
    .map((r) => {
      const isSubject = r.guestAId === guest.id;
      return {
        id: r.id,
        type: r.typeLabel,
        other: primaryName(isSubject ? r.guestB : r.guestA),
        isSubject,
      };
    });
}

export default function GuestList({
  guests,
  relations,
  onDelete,
  onConnect,
  onEdit,
  actionsDisabled = false,
}: GuestListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (guests.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-8 text-center"
        data-testid="guest-list-empty"
      >
        <UsersIcon className="h-8 w-8 text-rose-200" />
        <p className="text-sm text-stone-500">No guests yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="guest-list">
      {guests.map((guest) => {
        const name = primaryName(guest);
        const aliases = aliasNames(guest);
        const guestRelations = relationsOf(guest, relations);
        const isExpanded = expanded[guest.id] ?? false;
        const visibleRelations = isExpanded
          ? guestRelations
          : guestRelations.slice(0, MAX_RELATION_CHIPS);
        const hiddenCount = guestRelations.length - MAX_RELATION_CHIPS;
        return (
          <li
            key={guest.id}
            data-testid="guest-card"
            className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              {/* The card body is the edit affordance. */}
              <button
                type="button"
                data-testid="edit-guest-button"
                aria-label={`Edit ${name}`}
                title="Edit guest"
                disabled={actionsDisabled}
                onClick={() => onEdit(guest)}
                className="-m-1 flex min-w-0 items-start gap-3 rounded-lg p-1 text-left hover:bg-rose-50/60 disabled:pointer-events-none"
              >
                <Avatar name={name} />
                {/* spans only — <p>/<div> are invalid inside a <button> */}
                <span className="block min-w-0">
                  <span className="block font-medium text-stone-900">{name}</span>
                  {aliases.length > 0 && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-stone-500">
                      aka
                      {aliases.map((alias) => (
                        <span
                          key={alias.id}
                          className="rounded-full bg-stone-100 px-1.5 py-0.5 text-stone-600"
                        >
                          {alias.value}
                        </span>
                      ))}
                    </span>
                  )}
                  {(guest.phone || guest.address) && (
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                      {guest.phone && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" />
                          {guest.phone}
                        </span>
                      )}
                      {guest.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" />
                          {guest.address}
                        </span>
                      )}
                    </span>
                  )}
                  {guestRelations.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      {visibleRelations.map((relation) => (
                        <span
                          key={relation.id}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
                        >
                          <span className="font-medium">{relation.type}</span>
                          <span className="text-rose-400">
                            {relation.isSubject ? 'of' : ':'}
                          </span>
                          {relation.other}
                        </span>
                      ))}
                      {hiddenCount > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            // Inside the edit button — don't open the editor.
                            e.stopPropagation();
                            setExpanded((prev) => ({ ...prev, [guest.id]: !isExpanded }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpanded((prev) => ({ ...prev, [guest.id]: !isExpanded }));
                            }
                          }}
                          className="rounded-full px-1.5 py-0.5 text-xs text-stone-500 underline decoration-dotted hover:text-rose-700"
                        >
                          {isExpanded ? 'show less' : `+${hiddenCount} more`}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  data-testid="connect-button"
                  aria-label={`Add a relation for ${name}`}
                  disabled={actionsDisabled}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  onClick={() => onConnect(guest)}
                >
                  <LinkIcon className="h-3 w-3" />
                  Connect
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  className="text-xs text-stone-500 hover:text-red-600"
                  onClick={() => void onDelete(guest.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
