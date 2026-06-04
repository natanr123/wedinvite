'use client';

import { useId, useState } from 'react';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  testId?: string;
}

/**
 * Multi-value text input rendered as removable chips.
 * Enter / comma / blur / the "add" button commits the typed value as a chip;
 * Backspace on an empty input removes the last chip.
 */
export default function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  testId,
}: ChipInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const value = draft.trim();
    setDraft('');
    if (!value) return;
    const exists = values.some((v) => v.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...values, value]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2 py-1.5 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100/80 px-2.5 py-0.5 text-sm text-rose-900"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              // preventDefault so the input doesn't blur (blur would commit the draft)
              onMouseDown={(e) => e.preventDefault()}
              className="text-rose-600 hover:text-rose-800"
              onClick={() => onChange(values.filter((v) => v !== value))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          data-testid={testId}
          className="min-w-24 flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-stone-400"
          value={draft}
          placeholder={values.length === 0 ? placeholder : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
        />
        {draft.trim() !== '' && (
          <button
            type="button"
            aria-label={`Add name ${draft.trim()}`}
            // preventDefault keeps focus in the input so typing can continue
            onMouseDown={(e) => e.preventDefault()}
            onClick={commitDraft}
            className="shrink-0 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-rose-700"
          >
            ↵ add
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
