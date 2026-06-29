import type { Booking, EventType, Weekday } from "./types";

/** Returns the next `count` calendar days starting from `from` (inclusive). */
export function upcomingDays(from: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

export function isAvailableDay(et: EventType, day: Date): boolean {
  return et.availability.days.includes(day.getDay() as Weekday);
}

/**
 * Generates bookable slot start-times for a given event type on a given day,
 * excluding slots that are already booked or in the past.
 */
export function slotsForDay(et: EventType, day: Date, bookings: Booking[]): Date[] {
  if (!isAvailableDay(et, day)) return [];

  const taken = new Set(
    bookings.filter((b) => b.eventTypeId === et.id).map((b) => new Date(b.start).getTime()),
  );

  const slots: Date[] = [];
  const now = Date.now();
  for (let m = et.availability.startMin; m + et.durationMin <= et.availability.endMin; m += et.durationMin) {
    const slot = new Date(day);
    slot.setHours(0, m, 0, 0);
    if (slot.getTime() <= now) continue;
    if (taken.has(slot.getTime())) continue;
    slots.push(slot);
  }
  return slots;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
