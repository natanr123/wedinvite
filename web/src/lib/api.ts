import { reportClientError } from './report';
import type {
  Relation,
  RelationTypes,
  CreateRelationInput,
  CreateGuestInput,
  Guest,
  WeddingEvent,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Full error body — e.g. conflictingGuestId/Name on 409 duplicate guest. */
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // no-store: live data, and conditional requests caused some mobile
      // browsers to surface raw 304s to fetch(), which read as failures.
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (err) {
    reportClientError({
      kind: 'fetch-failed',
      path,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new ApiError(0, 'Cannot reach the server — is the API running?');
  }
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    let details: Record<string, unknown> | undefined;
    try {
      const body: unknown = await res.json();
      if (body && typeof body === 'object') {
        details = body as Record<string, unknown>;
        if ('message' in body) {
          const m = (body as { message: string | string[] }).message;
          message = Array.isArray(m) ? m.join(', ') : m;
        }
      }
    } catch {
      // non-JSON error body — keep the status text
    }
    // 4xx are expected app flow (validation, conflicts); anything else is an
    // anomaly worth reporting (5xx, or oddities like raw 304s from caches).
    if (res.status < 400 || res.status >= 500) {
      reportClientError({ kind: 'api-bad-status', path, status: res.status, message });
    }
    throw new ApiError(res.status, message, details);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  createEvent: (data: { title: string; eventDate?: string }) =>
    request<WeddingEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),
  getEvent: (id: string) => request<WeddingEvent>(`/events/${id}`),

  listGuests: (eventId: string) => request<Guest[]>(`/events/${eventId}/guests`),
  createGuest: (eventId: string, data: CreateGuestInput) =>
    request<Guest>(`/events/${eventId}/guests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGuest: (eventId: string, id: string, data: CreateGuestInput) =>
    request<Guest>(`/events/${eventId}/guests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteGuest: (eventId: string, id: string) =>
    request<void>(`/events/${eventId}/guests/${id}`, { method: 'DELETE' }),

  listRelations: (eventId: string) =>
    request<Relation[]>(`/events/${eventId}/relations`),
  createRelation: (eventId: string, data: CreateRelationInput) =>
    request<Relation>(`/events/${eventId}/relations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteRelation: (eventId: string, id: string) =>
    request<void>(`/events/${eventId}/relations/${id}`, { method: 'DELETE' }),

  listRelationTypes: (eventId: string) =>
    request<RelationTypes>(`/events/${eventId}/relation-types`),
};
