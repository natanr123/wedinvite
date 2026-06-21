'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { primaryName } from '@/lib/names';
import type { CreateRelationInput, Guest, RelationTypes } from '@/lib/types';
import { HeartIcon, LinkIcon } from './icons';

const CUSTOM_VALUE = '__custom__';

interface RelationFormProps {
  /** The guest whose "Connect" button opened this form — always side A. */
  fromGuest: Guest;
  guests: Guest[];
  types: RelationTypes;
  onAdd: (input: CreateRelationInput) => Promise<void>;
  /** Called after a relation is added successfully (closes the panel). */
  onDone?: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

/**
 * A relation reads "A is <type> of B". Side A is fixed — it's the guest the
 * user clicked "Connect" on, so the form only asks for the type and the
 * other guest.
 */
export default function RelationForm({
  fromGuest,
  guests,
  types,
  onAdd,
  onDone,
}: RelationFormProps) {
  const { t, tType } = useTranslation();
  const [guestBId, setGuestBId] = useState('');
  const [typeChoice, setTypeChoice] = useState('');
  const [customType, setCustomType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fromName = primaryName(fromGuest);
  const others = guests.filter((guest) => guest.id !== fromGuest.id);

  if (others.length === 0) {
    return (
      <div
        className="flex items-center gap-2 py-2 text-sm text-stone-500"
        data-testid="relation-form-disabled"
      >
        <LinkIcon className="h-4 w-4 text-rose-300" />
        {t('relationForm.needAnotherGuest', { name: fromName })}
      </div>
    );
  }

  const previewType = typeChoice === CUSTOM_VALUE ? customType.trim() : typeChoice;
  const otherName = guestBId
    ? primaryName(others.find((guest) => guest.id === guestBId) ?? fromGuest)
    : '';
  const previewReady = guestBId && previewType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const typeLabel = typeChoice === CUSTOM_VALUE ? customType.trim() : typeChoice;
    if (!guestBId) {
      setError(t('relationForm.pickGuest'));
      return;
    }
    if (!typeLabel) {
      setError(t('relationForm.pickType'));
      return;
    }
    setSaving(true);
    try {
      await onAdd({ guestAId: fromGuest.id, guestBId, typeLabel });
      setGuestBId('');
      setTypeChoice('');
      setCustomType('');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('relationForm.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="relation-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="relation-type">
            {t('relationForm.howKnows', { name: fromName })}
          </label>
          <select
            id="relation-type"
            data-testid="type-select"
            className={fieldClass}
            value={typeChoice}
            onChange={(e) => setTypeChoice(e.target.value)}
          >
            <option value="">{t('relationForm.chooseType')}</option>
            {types.custom.length > 0 && (
              <optgroup label={t('relationForm.yourTypes')}>
                {types.custom.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t('relationForm.presets')}>
              {types.presets.map((label) => (
                <option key={label} value={label}>
                  {tType(label)}
                </option>
              ))}
            </optgroup>
            <option value={CUSTOM_VALUE}>{t('relationForm.addOwnType')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="relation-b">
            {t('relationForm.otherGuest')}
          </label>
          <select
            id="relation-b"
            data-testid="guest-b-select"
            className={fieldClass}
            value={guestBId}
            onChange={(e) => setGuestBId(e.target.value)}
          >
            <option value="">{t('relationForm.chooseGuest')}</option>
            {others.map((guest) => (
              <option key={guest.id} value={guest.id}>
                {primaryName(guest)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {typeChoice === CUSTOM_VALUE && (
        <div className="sm:max-w-xs">
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="custom-type">
            {t('relationForm.newTypeName')}
          </label>
          <input
            id="custom-type"
            data-testid="custom-type-input"
            className={fieldClass}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder={t('relationForm.newTypePlaceholder')}
            autoFocus
          />
        </div>
      )}

      {previewReady && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
          <HeartIcon className="h-3.5 w-3.5 text-rose-400" />
          <span className="font-medium text-stone-900">
            <bdi>{fromName}</bdi>
          </span>
          {t('relation.is') && <span className="text-stone-500">{t('relation.is')}</span>}
          <span className="font-medium text-rose-700">
            <bdi>{tType(previewType)}</bdi>
          </span>
          <span className="text-stone-500">{t('relation.of')}</span>
          <span className="font-medium text-stone-900">
            <bdi>{otherName}</bdi>
          </span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" data-testid="relation-form-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        data-testid="add-relation-button"
        className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {saving ? t('relationForm.connecting') : t('relationForm.addRelation')}
      </button>
    </form>
  );
}
