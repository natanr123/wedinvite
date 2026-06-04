'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarIcon, ChevronRightIcon, HeartIcon } from '@/components/icons';
import { api, ApiError } from '@/lib/api';
import { formatEventDate } from '@/lib/format';
import { getSavedEventIds, removeEventId, saveEventId } from '@/lib/storage';
import type { WeddingEvent } from '@/lib/types';

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedEvents, setSavedEvents] = useState<WeddingEvent[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      const ids = getSavedEventIds();
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            return await api.getEvent(id);
          } catch (err) {
            // Gone (404) or malformed id (400) — forget it. Keep it on network errors.
            if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
              removeEventId(id);
            }
            return null;
          }
        }),
      );
      if (!cancelled) {
        setSavedEvents(results.filter((event): event is WeddingEvent => event !== null));
        setLoadingSaved(false);
      }
    }
    void loadSaved();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Give your event a name');
      return;
    }
    setCreating(true);
    try {
      const event = await api.createEvent({
        title: title.trim(),
        eventDate: eventDate || undefined,
      });
      saveEventId(event.id);
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create the event');
      setCreating(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-xl">
        <header className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-rose-300">
            <span className="h-px w-12 bg-rose-200" aria-hidden />
            <HeartIcon className="h-6 w-6" />
            <span className="h-px w-12 bg-rose-200" aria-hidden />
          </div>
          <h1 className="font-serif text-5xl text-rose-900">WedInvite</h1>
          <p className="mt-3 text-stone-600">
            Plan your guest list and who knows whom — no sign-up needed.
          </p>
        </header>

        <section className="rounded-2xl border border-rose-100 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h2 className="mb-4 font-serif text-2xl text-stone-900">Create a new event</h2>
          <form onSubmit={handleCreate} className="space-y-3" data-testid="create-event-form">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="event-title">
                Event name *
              </label>
              <input
                id="event-title"
                data-testid="event-title-input"
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dana & Noam's Wedding"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700" htmlFor="event-date">
                Date <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <input
                id="event-date"
                type="date"
                data-testid="event-date-input"
                className={inputClass}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" data-testid="create-event-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={creating}
              data-testid="create-event-button"
              className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 font-serif text-2xl text-stone-900">Your events</h2>
          {loadingSaved ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : savedEvents.length === 0 ? (
            <p className="text-sm italic text-stone-500" data-testid="no-saved-events">
              Events you create on this browser will show up here.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="saved-events">
              {savedEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    data-testid="event-card"
                    className="group flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-900">
                        {event.title}
                      </span>
                      {event.eventDate && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                          <CalendarIcon className="h-3 w-3 text-rose-400" />
                          {formatEventDate(event.eventDate)}
                        </span>
                      )}
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-rose-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
