# Bookilink

A lightweight **booking-link** app — Calendly-style. Publish meeting types,
share a link, and let people book a free slot with you.

> Self-contained project living in the `bookilink/` subfolder. It shares no code
> with the surrounding repo and can be lifted out into its own repo at any time.

## Features

- **Event types** — create meeting types (title, duration, color, weekly
  availability window) and get a shareable link for each.
- **Public booking page** — visitors open a link, pick an open time slot in the
  next two weeks, and confirm with their name/email. Booked slots disappear so
  there are no double-bookings.
- **Bookings dashboard** — see upcoming and past bookings; cancel to free a slot.
- **Settings** — edit how you appear (name, handle, bio, timezone).
- **Local persistence** — everything is stored in the browser via
  `localStorage`, so the prototype works with no backend.

## Tech

React 19 · TypeScript · Vite. No router or state library — a tiny hash router
(`src/router.ts`) and a `useSyncExternalStore` store (`src/store.ts`) keep
dependencies minimal.

## Getting started

```bash
cd bookilink
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Project layout

```
src/
  App.tsx                  route switch (host chrome vs. public page)
  router.ts                hash-based routing + public-link helper
  store.ts                 localStorage-backed app state + actions
  slots.ts                 slot generation & date formatting
  types.ts                 domain types
  components/
    NavBar.tsx
    EventTypeEditor.tsx    create/edit modal
  pages/
    Dashboard.tsx          event types + share links (host)
    BookingsPage.tsx       upcoming/past bookings (host)
    SettingsPage.tsx       host profile
    BookingPage.tsx        public booking flow (guest)
```

## Roadmap ideas

- Real backend + authentication (multiple hosts)
- Email confirmations and calendar invites (`.ics`)
- Timezone conversion for guests
- Buffer times, daily limits, and date overrides
