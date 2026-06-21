'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { aliasNames, primaryName } from '@/lib/names';
import type { Guest, Relation } from '@/lib/types';
import Avatar from './Avatar';
import { ChevronDownIcon, LinkIcon, MapPinIcon, PhoneIcon, UsersIcon } from './icons';

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
  const { t, tType } = useTranslation();
  // Per-guest "more info" toggle: the card shows only the name by default;
  // aliases, contact and relations live behind the expander.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (guests.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-8 text-center"
        data-testid="guest-list-empty"
      >
        <UsersIcon className="h-8 w-8 text-rose-200" />
        <p className="text-sm text-stone-500">{t('guest.noGuests')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="guest-list">
      {guests.map((guest) => {
        const name = primaryName(guest);
        const aliases = aliasNames(guest);
        const guestRelations = relationsOf(guest, relations);
        const isOpen = expanded[guest.id] ?? false;
        const hasExtra =
          aliases.length > 0 ||
          Boolean(guest.phone) ||
          Boolean(guest.address) ||
          guestRelations.length > 0;
        return (
          <li
            key={guest.id}
            data-testid="guest-card"
            className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              {/* The card body is the edit affordance. */}
              <button
                type="button"
                data-testid="edit-guest-button"
                aria-label={t('guest.editAria', { name })}
                title={t('guest.editGuestTitle')}
                disabled={actionsDisabled}
                onClick={() => onEdit(guest)}
                className="-m-1 flex min-w-0 items-center gap-3 rounded-lg p-1 text-start hover:bg-rose-50/60 disabled:pointer-events-none"
              >
                <Avatar name={name} />
                <span className="block min-w-0 truncate font-medium text-stone-900">
                  <bdi>{name}</bdi>
                </span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  data-testid="connect-button"
                  aria-label={t('guest.connectAria', { name })}
                  disabled={actionsDisabled}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  onClick={() => onConnect(guest)}
                >
                  <LinkIcon className="h-3 w-3" />
                  {t('guest.connect')}
                </button>
                <button
                  type="button"
                  aria-label={t('guest.deleteAria', { name })}
                  className="text-xs text-stone-500 hover:text-red-600"
                  onClick={() => void onDelete(guest.id)}
                >
                  {t('common.remove')}
                </button>
              </div>
            </div>

            {hasExtra && (
              <div className="mt-1.5">
                <button
                  type="button"
                  data-testid="more-info-button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [guest.id]: !isOpen }))
                  }
                  className="inline-flex items-center gap-1 rounded-md text-xs text-stone-500 hover:text-rose-700"
                >
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                  {isOpen ? t('guest.lessInfo') : t('guest.moreInfo')}
                </button>

                {isOpen && (
                  <div data-testid="guest-extra" className="mt-2 space-y-1.5">
                    {aliases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
                        {t('guest.aka')}
                        {aliases.map((alias) => (
                          <span
                            key={alias.id}
                            className="rounded-full bg-stone-100 px-1.5 py-0.5 text-stone-600"
                          >
                            <bdi>{alias.value}</bdi>
                          </span>
                        ))}
                      </div>
                    )}
                    {(guest.phone || guest.address) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                        {guest.phone && (
                          <span className="inline-flex items-center gap-1">
                            <PhoneIcon className="h-3 w-3" />
                            <bdi dir="ltr">{guest.phone}</bdi>
                          </span>
                        )}
                        {guest.address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3" />
                            <bdi>{guest.address}</bdi>
                          </span>
                        )}
                      </div>
                    )}
                    {guestRelations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {guestRelations.map((relation) => (
                          <span
                            key={relation.id}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
                          >
                            <span className="font-medium">{tType(relation.type)}</span>
                            <span className="text-rose-400">
                              {relation.isSubject ? t('relation.of') : ':'}
                            </span>
                            <bdi>{relation.other}</bdi>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
