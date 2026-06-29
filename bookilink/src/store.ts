import { useCallback, useSyncExternalStore } from "react";
import type { AppState, Booking, EventType } from "./types";

const STORAGE_KEY = "bookilink:v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function seed(): AppState {
  return {
    host: {
      name: "Ada Lovelace",
      handle: "ada",
      bio: "Engineering mentor. Pick a time that works and let's talk.",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    eventTypes: [
      {
        id: uid(),
        slug: "intro-call",
        title: "Intro call",
        description: "A quick chat to get to know each other.",
        durationMin: 30,
        color: "#4f46e5",
        availability: { days: [1, 2, 3, 4, 5], startMin: 9 * 60, endMin: 17 * 60 },
      },
      {
        id: uid(),
        slug: "deep-dive",
        title: "Deep dive session",
        description: "Focused working session on your project.",
        durationMin: 60,
        color: "#0d9488",
        availability: { days: [2, 4], startMin: 13 * 60, endMin: 18 * 60 },
      },
    ],
    bookings: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // fall through to seed
  }
  const initial = seed();
  save(initial);
  return initial;
}

let state: AppState = load();
const listeners = new Set<() => void>();

function save(next: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private-mode errors
  }
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  save(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function useActions() {
  const upsertEventType = useCallback((et: Omit<EventType, "id"> & { id?: string }) => {
    setState((prev) => {
      if (et.id) {
        return {
          ...prev,
          eventTypes: prev.eventTypes.map((e) =>
            e.id === et.id ? ({ ...e, ...et, id: e.id } as EventType) : e,
          ),
        };
      }
      return { ...prev, eventTypes: [...prev.eventTypes, { ...et, id: uid() } as EventType] };
    });
  }, []);

  const deleteEventType = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.filter((e) => e.id !== id),
      bookings: prev.bookings.filter((b) => b.eventTypeId !== id),
    }));
  }, []);

  const addBooking = useCallback((b: Omit<Booking, "id" | "createdAt">) => {
    const booking: Booking = { ...b, id: uid(), createdAt: new Date().toISOString() };
    setState((prev) => ({ ...prev, bookings: [...prev.bookings, booking] }));
    return booking;
  }, []);

  const cancelBooking = useCallback((id: string) => {
    setState((prev) => ({ ...prev, bookings: prev.bookings.filter((b) => b.id !== id) }));
  }, []);

  const updateHost = useCallback((patch: Partial<AppState["host"]>) => {
    setState((prev) => ({ ...prev, host: { ...prev.host, ...patch } }));
  }, []);

  return { upsertEventType, deleteEventType, addBooking, cancelBooking, updateHost };
}
