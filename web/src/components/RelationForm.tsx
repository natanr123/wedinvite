'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { primaryName } from '@/lib/names';
import type { CreateRelationInput, Guest, RelationTypes } from '@/lib/types';
import { HeartIcon, LinkIcon } from './icons';

const CUSTOM_VALUE = '__custom__';

interface RelationFormProps {
  /** Preselected side A — set when opened from a guest's "Connect" button. */
  fromGuest?: Guest | null;
  guests: Guest[];
  types: RelationTypes;
  onAdd: (input: CreateRelationInput) => Promise<void>;
  /** Called after a relation is added successfully (closes the panel). */
  onDone?: () => void;
}

const fieldClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

/** A relation reads "A is <type> of B" — side A is the subject. */
export default function RelationForm({
  fromGuest,
  guests,
  types,
  onAdd,
  onDone,
}: RelationFormProps) {
  const [guestAId, setGuestAId] = useState(fromGuest?.id ?? '');
  const [guestBId, setGuestBId] = useState('');
  const [typeChoice, setTypeChoice] = useState('');
  const [customType, setCustomType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (guests.length < 2) {
    return (
      <div
        className="flex items-center gap-2 py-2 text-sm text-stone-500"
        data-testid="relation-form-disabled"
      >
        <LinkIcon className="h-4 w-4 text-rose-300" />
        Add at least two guests to start connecting them.
      </div>
    );
  }

  const nameOf = (guestId: string) => {
    const guest = guests.find((g) => g.id === guestId);
    return guest ? primaryName(guest) : '';
  };
  const previewType = typeChoice === CUSTOM_VALUE ? customType.trim() : typeChoice;
  const previewReady = guestAId && guestBId && previewType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const typeLabel = typeChoice === CUSTOM_VALUE ? customType.trim() : typeChoice;
    if (!guestAId || !guestBId) {
      setError('Pick both guests');
      return;
    }
    if (guestAId === guestBId) {
      setError('Pick two different guests');
      return;
    }
    if (!typeLabel) {
      setError('Pick or type a relation type');
      return;
    }
    setSaving(true);
    try {
      await onAdd({ guestAId, guestBId, typeLabel });
      setGuestBId('');
      setTypeChoice('');
      setCustomType('');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add relation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="relation-form">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="relation-a">
          Guest
        </label>
        <select
          id="relation-a"
          data-testid="guest-a-select"
          className={fieldClass}
          value={guestAId}
          onChange={(e) => {
            setGuestAId(e.target.value);
            // The other guest can no longer be the same person.
            if (e.target.value === guestBId) setGuestBId('');
          }}
        >
          <option value="">Choose a guest…</option>
          {guests.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {primaryName(guest)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="relation-type">
          {guestAId ? `How does ${nameOf(guestAId)} know them?` : 'How do they know each other?'}
        </label>
        <select
          id="relation-type"
          data-testid="type-select"
          className={fieldClass}
          value={typeChoice}
          onChange={(e) => setTypeChoice(e.target.value)}
        >
          <option value="">Choose a type…</option>
          {types.custom.length > 0 && (
            <optgroup label="Your types">
              {types.custom.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Presets">
            {types.presets.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </optgroup>
          <option value={CUSTOM_VALUE}>+ Add your own type…</option>
        </select>
      </div>

      {typeChoice === CUSTOM_VALUE && (
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="custom-type">
            New type name
          </label>
          <input
            id="custom-type"
            data-testid="custom-type-input"
            className={fieldClass}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Army Buddy, Childhood Friend…"
            autoFocus
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="relation-b">
          Other guest
        </label>
        <select
          id="relation-b"
          data-testid="guest-b-select"
          className={fieldClass}
          value={guestBId}
          onChange={(e) => setGuestBId(e.target.value)}
        >
          <option value="">Choose a guest…</option>
          {guests
            .filter((guest) => guest.id !== guestAId)
            .map((guest) => (
              <option key={guest.id} value={guest.id}>
                {primaryName(guest)}
              </option>
            ))}
        </select>
      </div>

      {previewReady && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
          <HeartIcon className="h-3.5 w-3.5 text-rose-400" />
          <span className="font-medium text-stone-900">{nameOf(guestAId)}</span>
          is <span className="font-medium text-rose-700">{previewType}</span> of
          <span className="font-medium text-stone-900">{nameOf(guestBId)}</span>
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
        {saving ? 'Connecting…' : 'Add relation'}
      </button>
    </form>
  );
}
