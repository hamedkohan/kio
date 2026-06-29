// Core domain types for Bookilink.
//
// A Host publishes one or more EventTypes (e.g. "30 min intro call"). Each
// EventType has a weekly availability window. Visitors open the host's public
// link, pick a free slot, and create a Booking.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Availability {
  /** Days of the week the host accepts bookings on. */
  days: Weekday[];
  /** Start of the daily window, minutes from midnight (e.g. 9:00 => 540). */
  startMin: number;
  /** End of the daily window, minutes from midnight (e.g. 17:00 => 1020). */
  endMin: number;
}

export interface EventType {
  id: string;
  /** URL-safe identifier used in the public link, e.g. "intro-call". */
  slug: string;
  title: string;
  description: string;
  /** Meeting length in minutes. */
  durationMin: number;
  /** Accent color for the public page. */
  color: string;
  availability: Availability;
}

export interface Host {
  name: string;
  /** URL-safe handle, e.g. "ada". */
  handle: string;
  bio: string;
  timezone: string;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  /** ISO datetime string for the start of the slot. */
  start: string;
  durationMin: number;
  guestName: string;
  guestEmail: string;
  notes: string;
  createdAt: string;
}

export interface AppState {
  host: Host;
  eventTypes: EventType[];
  bookings: Booking[];
}
