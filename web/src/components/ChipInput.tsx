'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useId, useState } from 'react';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  testId?: string;
}

interface SortableChipProps {
  value: string;
  isPrimary: boolean;
  onRemove: () => void;
}

/**
 * A draggable name chip. The first chip is the PRIMARY name (shown
 * everywhere in the app) — drag any chip to the front to promote it.
 */
function SortableChip({ value, isPrimary, onRemove }: SortableChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: value });

  return (
    <span
      ref={setNodeRef}
      data-testid={`chip-${value}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`inline-flex touch-none select-none items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm cursor-grab active:cursor-grabbing ${
        isPrimary
          ? 'border-rose-300 bg-rose-200/80 font-medium text-rose-900'
          : 'border-rose-200 bg-rose-100/80 text-rose-900'
      } ${isDragging ? 'z-10 opacity-70 shadow-md' : ''}`}
      {...attributes}
      {...listeners}
    >
      {isPrimary && (
        <span aria-hidden className="text-[10px] text-rose-500">
          ★
        </span>
      )}
      {value}
      <button
        type="button"
        aria-label={`Remove ${value}`}
        // preventDefault keeps the text input focused (blur would commit the
        // draft); stopPropagation keeps the drag sensor from activating.
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => e.preventDefault()}
        className="text-rose-600 hover:text-rose-800"
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}

/**
 * Multi-value text input rendered as removable, DRAGGABLE chips.
 * Enter / comma / blur / the "add" button commits the typed value as a chip;
 * Backspace on an empty input removes the last chip; dragging reorders —
 * the first chip is the primary name.
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
  const sensors = useSensors(
    // distance > 0 keeps plain clicks (e.g. on a chip's ×) from starting drags
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = values.indexOf(String(active.id));
    const newIndex = values.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(values, oldIndex, newIndex));
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2 py-1.5 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={values} strategy={rectSortingStrategy}>
            {values.map((value, index) => (
              <SortableChip
                key={value}
                value={value}
                isPrimary={index === 0}
                onRemove={() => onChange(values.filter((v) => v !== value))}
              />
            ))}
          </SortableContext>
        </DndContext>
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
