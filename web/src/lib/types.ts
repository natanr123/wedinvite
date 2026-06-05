export interface WeddingEvent {
  id: string;
  title: string;
  eventDate: string | null;
  createdAt: string;
}

export type NameKind = 'first' | 'last';

export interface GuestName {
  id: string;
  guestId: string;
  kind: NameKind;
  value: string;
  position: number;
}

export interface Guest {
  id: string;
  eventId: string;
  phone: string | null;
  address: string | null;
  names: GuestName[];
  createdAt: string;
}

export interface Relation {
  id: string;
  eventId: string;
  guestAId: string;
  guestBId: string;
  guestA: Guest;
  guestB: Guest;
  typeLabel: string;
  createdAt: string;
}

export interface RelationTypes {
  presets: string[];
  custom: string[];
}

export interface CreateGuestInput {
  firstNames: string[];
  lastNames: string[]; // required — name combinations are unique per event
  phone?: string;
  address?: string;
}

export interface CreateRelationInput {
  guestAId: string;
  guestBId: string;
  typeLabel: string;
}
