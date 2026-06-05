'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import GuestForm from '@/components/GuestForm';
import GuestList from '@/components/GuestList';
import Panel from '@/components/Panel';
import RelationForm from '@/components/RelationForm';
import RelationList from '@/components/RelationList';
import { CalendarIcon, PlusIcon } from '@/components/icons';
import { api, ApiError } from '@/lib/api';
import { formatEventDate } from '@/lib/format';
import { primaryName } from '@/lib/names';
import { removeEventId, saveEventId } from '@/lib/storage';
import type {
  CreateGuestInput,
  CreateRelationInput,
  Guest,
  Relation,
  RelationTypes,
  WeddingEvent,
} from '@/lib/types';

type Status = 'loading' | 'ready' | 'not-found' | 'error';
type Tab = 'guests' | 'relations';

/**
 * One action at a time: either the "add guest" form or the "add relation"
 * form is open — never both (single state field). Relations are only added
 * from a guest's "Connect" button, so fromGuest is always known.
 */
type PanelState =
  | { kind: 'none' }
  | { kind: 'guest' }
  | { kind: 'relation'; fromGuest: Guest };

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [types, setTypes] = useState<RelationTypes>({ presets: [], custom: [] });
  const [tab, setTab] = useState<Tab>('guests');
  const [panel, setPanel] = useState<PanelState>({ kind: 'none' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [ev, gs, rs, ts] = await Promise.all([
          api.getEvent(id),
          api.listGuests(id),
          api.listRelations(id),
          api.listRelationTypes(id),
        ]);
        if (cancelled) return;
        setEvent(ev);
        setGuests(gs);
        setRelations(rs);
        setTypes(ts);
        setStatus('ready');
        // Visiting an event keeps it in this browser's "Your events" list.
        saveEventId(id);
      } catch (err) {
        if (cancelled) return;
        // 400 = malformed (non-UUID) id rejected by the API — same as not found.
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          removeEventId(id);
          setStatus('not-found');
        } else {
          setStatus('error');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const closePanel = useCallback(() => setPanel({ kind: 'none' }), []);

  const refreshGuestsAndRelations = useCallback(async () => {
    const [gs, rs] = await Promise.all([api.listGuests(id), api.listRelations(id)]);
    setGuests(gs);
    setRelations(rs);
  }, [id]);

  const handleAddGuest = useCallback(
    async (input: CreateGuestInput) => {
      await api.createGuest(id, input);
      setGuests(await api.listGuests(id));
    },
    [id],
  );

  const handleDeleteGuest = useCallback(
    async (guestId: string) => {
      await api.deleteGuest(id, guestId);
      // Deleting a guest also removes their relations (DB cascade).
      await refreshGuestsAndRelations();
    },
    [id, refreshGuestsAndRelations],
  );

  const handleAddRelation = useCallback(
    async (input: CreateRelationInput) => {
      await api.createRelation(id, input);
      const [rs, ts] = await Promise.all([api.listRelations(id), api.listRelationTypes(id)]);
      setRelations(rs);
      setTypes(ts); // a custom type may have been registered
    },
    [id],
  );

  const handleDeleteRelation = useCallback(
    async (relationId: string) => {
      await api.deleteRelation(id, relationId);
      setRelations(await api.listRelations(id));
    },
    [id],
  );

  if (status === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-stone-500">Loading event…</p>
      </main>
    );
  }

  if (status === 'not-found' || status === 'error' || !event) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="font-serif text-3xl text-stone-900">
          {status === 'not-found' ? 'Event not found' : 'Something went wrong'}
        </h1>
        <p className="text-stone-600">
          {status === 'not-found'
            ? 'This event does not exist (anymore).'
            : 'Could not load the event — is the API running?'}
        </p>
        <Link href="/" className="text-rose-700 underline hover:text-rose-900">
          Back to home
        </Link>
      </main>
    );
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-rose-600 text-white shadow-sm' : 'text-stone-600 hover:text-rose-700'
    }`;

  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-5">
          <Link href="/" className="text-sm text-rose-700 hover:underline">
            ← All events
          </Link>
          <h1
            className="mt-1.5 font-serif text-3xl text-rose-900 sm:text-4xl"
            data-testid="event-title"
          >
            {event.title}
          </h1>
          {event.eventDate && (
            <p
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-stone-600"
              data-testid="event-date"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-rose-400" />
              {formatEventDate(event.eventDate)}
            </p>
          )}
        </header>

        {/* One action at a time: the button expands the inline guest form;
            relations are added from a guest card's "Connect" button. While
            either form is open, the other entry points are disabled. */}
        <div className="mb-4">
          <button
            type="button"
            data-testid="open-guest-panel"
            aria-expanded={panel.kind === 'guest'}
            onClick={() =>
              setPanel(panel.kind === 'guest' ? { kind: 'none' } : { kind: 'guest' })
            }
            disabled={panel.kind === 'relation'}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-40 aria-expanded:bg-rose-800"
          >
            <PlusIcon
              className={`h-4 w-4 transition-transform ${panel.kind === 'guest' ? 'rotate-45' : ''}`}
            />
            {panel.kind === 'guest' ? 'Close' : 'Add guest'}
          </button>
        </div>

        {panel.kind === 'guest' && (
          <Panel title="Add guest" onClose={closePanel} testId="guest-panel">
            <p className="mb-3 text-xs text-stone-500">
              Add every name this guest goes by — it helps avoid inviting the same
              person twice.
            </p>
            <GuestForm guests={guests} onAdd={handleAddGuest} onDone={closePanel} />
          </Panel>
        )}
        {panel.kind === 'relation' && (
          <Panel
            title={`Add relation for ${primaryName(panel.fromGuest)}`}
            onClose={closePanel}
            testId="relation-panel"
          >
            <p className="mb-3 text-xs text-stone-500">
              Who knows whom — siblings, friends, coworkers…
            </p>
            <RelationForm
              // Remount when opened for a different guest so the form resets.
              key={panel.fromGuest.id}
              fromGuest={panel.fromGuest}
              guests={guests}
              types={types}
              onAdd={handleAddRelation}
              onDone={closePanel}
            />
          </Panel>
        )}

        <div
          role="tablist"
          aria-label="Event lists"
          className="mb-4 flex rounded-full border border-rose-100 bg-white/80 p-1 backdrop-blur"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'guests'}
            data-testid="tab-guests"
            onClick={() => setTab('guests')}
            className={tabClass(tab === 'guests')}
          >
            Guests <span data-testid="guest-count">({guests.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'relations'}
            data-testid="tab-relations"
            onClick={() => setTab('relations')}
            className={tabClass(tab === 'relations')}
          >
            Relations <span data-testid="relation-count">({relations.length})</span>
          </button>
        </div>

        {/* Both lists stay mounted; the inactive one is just hidden. */}
        <div className={tab === 'guests' ? '' : 'hidden'}>
          <GuestList
            guests={guests}
            relations={relations}
            onDelete={handleDeleteGuest}
            onConnect={(guest) => setPanel({ kind: 'relation', fromGuest: guest })}
            connectDisabled={panel.kind === 'guest'}
          />
          {guests.length === 0 && (
            <button
              type="button"
              onClick={() => setPanel({ kind: 'guest' })}
              className="mx-auto block rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Add your first guest
            </button>
          )}
        </div>
        <div className={tab === 'relations' ? '' : 'hidden'}>
          <RelationList relations={relations} onDelete={handleDeleteRelation} />
          {relations.length === 0 && guests.length >= 2 && (
            <p className="mt-2 text-center text-xs text-stone-500">
              Tip: hit <span className="font-medium text-rose-700">Connect</span> on a
              guest&apos;s card to link them to someone.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
