'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  findExactDuplicates,
  findPossibleDuplicates,
  nameValues,
  primaryName,
} from '@/lib/names';
import type { CreateGuestInput, Guest } from '@/lib/types';
import ChipInput from './ChipInput';
import { SparklesIcon } from './icons';

interface GuestFormProps {
  guests: Guest[];
  /** When set, the form edits this guest (prefilled, excluded from dup checks). */
  initial?: Guest;
  onSubmit: (input: CreateGuestInput) => Promise<void>;
  /** Called after a successful submit (closes the panel). */
  onDone?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none placeholder:text-stone-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

export default function GuestForm({ guests, initial, onSubmit, onDone }: GuestFormProps) {
  const { t, tp } = useTranslation();
  const [firstNames, setFirstNames] = useState<string[]>(
    initial ? nameValues(initial, 'first') : [],
  );
  const [lastNames, setLastNames] = useState<string[]>(
    initial ? nameValues(initial, 'last') : [],
  );
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // When editing, the guest's own names are not conflicts.
  const others = initial ? guests.filter((guest) => guest.id !== initial.id) : guests;
  // Hard conflicts (the server rejects these with 409 — submit is blocked)
  // vs soft "looks similar" hints (still allowed).
  const exactDuplicates = findExactDuplicates(others, firstNames, lastNames);
  const softDuplicates = findPossibleDuplicates(others, firstNames, lastNames).filter(
    (guest) => !exactDuplicates.includes(guest),
  );
  // Only meaningful once a first name exists — a guest can't be created without one.
  const preview = firstNames[0] ? [firstNames[0], lastNames[0]].filter(Boolean).join(' ') : '';
  const extraNames =
    firstNames.length + lastNames.length - (firstNames[0] ? 1 : 0) - (lastNames[0] ? 1 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (firstNames.length === 0) {
      setError(t('guestForm.firstRequired'));
      return;
    }
    if (lastNames.length === 0) {
      setError(t('guestForm.lastRequired'));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        firstNames,
        lastNames,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (!initial) {
        setFirstNames([]);
        setLastNames([]);
        setPhone('');
        setAddress('');
      }
      onDone?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(initial ? 'guestForm.saveFailed' : 'guestForm.addFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="guest-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <ChipInput
          label={t('guestForm.firstNames')}
          values={firstNames}
          onChange={setFirstNames}
          placeholder={t('guestForm.firstPlaceholder')}
          hint={t('guestForm.firstHint')}
          testId="first-names-input"
        />
        <ChipInput
          label={t('guestForm.lastNames')}
          values={lastNames}
          onChange={setLastNames}
          placeholder={t('guestForm.lastPlaceholder')}
          hint={t('guestForm.lastHint')}
          testId="last-names-input"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="guest-phone">
            {t('guestForm.phone')}{' '}
            <span className="font-normal text-stone-400">{t('common.optional')}</span>
          </label>
          <input
            id="guest-phone"
            data-testid="phone-input"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('guestForm.phonePlaceholder')}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="guest-address">
            {t('guestForm.address')}{' '}
            <span className="font-normal text-stone-400">{t('common.optional')}</span>
          </label>
          <input
            id="guest-address"
            data-testid="address-input"
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('guestForm.addressPlaceholder')}
          />
        </div>
      </div>

      {preview && (
        <p className="flex items-center gap-1.5 text-xs text-stone-600">
          <SparklesIcon className="h-3.5 w-3.5 text-rose-400" />
          {t('guestForm.willAppearAs')}{' '}
          <span className="font-medium text-stone-900">{preview}</span>
          {extraNames > 0 && (
            <span className="text-stone-400">{tp('guestForm.morePreview', extraNames)}</span>
          )}
        </p>
      )}

      {exactDuplicates.length > 0 && (
        <p
          data-testid="duplicate-blocked"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {t('guestForm.duplicateBlocked', {
            names: exactDuplicates.map((g) => primaryName(g)).join(', '),
          })}
        </p>
      )}
      {softDuplicates.length > 0 && (
        <p
          data-testid="duplicate-warning"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {t('guestForm.duplicateWarning', {
            names: softDuplicates.map((g) => primaryName(g)).join(', '),
          })}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" data-testid="guest-form-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || exactDuplicates.length > 0}
        data-testid="add-guest-button"
        className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {saving
          ? t('common.saving')
          : initial
            ? t('guestForm.saveChanges')
            : t('guestForm.submitAdd')}
      </button>
    </form>
  );
}
