'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface PanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}

/**
 * Expandable action form — no popup: it opens inline in the page flow,
 * right below the action bar. Only one panel is ever mounted at a time
 * (the page keeps a single panel state), so actions stay mutually exclusive.
 */
export default function Panel({ title, onClose, children, testId }: PanelProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Opened from further down the page (a guest's "Connect" button)? Bring it into view.
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section
      ref={ref}
      aria-label={title}
      data-testid={testId}
      className="panel-expand mb-4 overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/60 px-4 py-3">
        <h2 className="font-serif text-lg text-stone-900">{title}</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-rose-100 hover:text-stone-800"
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
