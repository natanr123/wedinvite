'use client';

import { useTranslation } from '@/lib/i18n';
import { primaryName } from '@/lib/names';
import type { Relation } from '@/lib/types';
import Avatar from './Avatar';
import { LinkIcon } from './icons';

interface RelationListProps {
  relations: Relation[];
  onDelete: (id: string) => Promise<void>;
}

export default function RelationList({ relations, onDelete }: RelationListProps) {
  const { t, tType } = useTranslation();
  if (relations.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-6 text-center"
        data-testid="relation-list-empty"
      >
        <LinkIcon className="h-8 w-8 text-rose-200" />
        <p className="text-sm text-stone-500">{t('relation.noRelations')}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="relation-list">
      {relations.map((relation) => {
        const nameA = primaryName(relation.guestA);
        const nameB = primaryName(relation.guestB);
        return (
          <li
            key={relation.id}
            data-testid="relation-row"
            className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-sm"
          >
            {/* Preserves direction: "A is <type> of B", same phrasing as the form */}
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-stone-900">
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={nameA} size="sm" />
                <span className="font-medium">
                  <bdi>{nameA}</bdi>
                </span>
              </span>
              {t('relation.is') && (
                <span className="text-xs italic text-stone-500">{t('relation.is')}</span>
              )}
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                <bdi>{tType(relation.typeLabel)}</bdi>
              </span>
              <span className="text-xs italic text-stone-500">{t('relation.of')}</span>
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={nameB} size="sm" />
                <span className="font-medium">
                  <bdi>{nameB}</bdi>
                </span>
              </span>
            </div>
            <button
              type="button"
              aria-label={t('relation.deleteAria', { a: nameA, b: nameB })}
              className="shrink-0 text-xs text-stone-500 hover:text-red-600"
              onClick={() => void onDelete(relation.id)}
            >
              {t('common.remove')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
