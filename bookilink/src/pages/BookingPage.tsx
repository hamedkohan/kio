import { useMemo, useState } from "react";
import { useActions, useStore } from "../store";
import { navigate } from "../router";
import { formatDateTime, formatDay, formatTime, slotsForDay, upcomingDays } from "../slots";
import type { Booking } from "../types";

const DAYS_TO_SHOW = 14;

export function BookingPage({ slug }: { slug: string }) {
  const { host, eventTypes, bookings } = useStore();
  const { addBooking } = useActions();
  const eventType = eventTypes.find((e) => e.slug === slug);

  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const days = useMemo(() => upcomingDays(new Date(), DAYS_TO_SHOW), []);

  if (!eventType) {
    return (
      <div className="public">
        <div className="public-card not-found">
          <h1>Link not found</h1>
          <p className="muted">This booking link doesn’t exist or was removed.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go to Bookilink
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="public" style={{ ["--accent" as string]: eventType.color }}>
        <div className="public-card confirmed">
          <div className="check">✓</div>
          <h1>You’re booked!</h1>
          <p className="muted">A calendar-style confirmation would normally be emailed to you.</p>
          <div className="confirm-box">
            <div className="confirm-line">
              <strong>{eventType.title}</strong> with {host.name}
            </div>
            <div className="confirm-line">{formatDateTime(confirmed.start)}</div>
            <div className="confirm-line muted">
              {confirmed.durationMin} min · {host.timezone}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setConfirmed(null);
              setSelectedSlot(null);
              setName("");
              setEmail("");
              setNotes("");
            }}
          >
            Book another time
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public" style={{ ["--accent" as string]: eventType.color }}>
      <div className="public-card booking-layout">
        <aside className="booking-aside">
          <div className="host-block">
            <span className="avatar lg">{host.name.charAt(0)}</span>
            <div>
              <div className="host-name">{host.name}</div>
              <div className="muted small">{host.bio}</div>
            </div>
          </div>
          <h1 className="event-title">{eventType.title}</h1>
          <p className="muted">{eventType.description}</p>
          <ul className="event-facts">
            <li>⏱ {eventType.durationMin} min</li>
            <li>🌍 {host.timezone}</li>
          </ul>
        </aside>

        <div className="booking-pick">
          {!selectedSlot ? (
            <>
              <h2 className="section-title">Select a time</h2>
              <div className="day-columns">
                {days.map((day) => {
                  const slots = slotsForDay(eventType, day, bookings);
                  if (slots.length === 0) return null;
                  return (
                    <div className="day-column" key={day.toISOString()}>
                      <div className="day-label">{formatDay(day)}</div>
                      <div className="slot-stack">
                        {slots.map((slot) => (
                          <button
                            key={slot.toISOString()}
                            className="slot"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {days.every((d) => slotsForDay(eventType, d, bookings).length === 0) && (
                  <p className="muted">No times available in the next two weeks.</p>
                )}
              </div>
            </>
          ) : (
            <form
              className="guest-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || !email.trim()) return;
                const booking = addBooking({
                  eventTypeId: eventType.id,
                  start: selectedSlot.toISOString(),
                  durationMin: eventType.durationMin,
                  guestName: name.trim(),
                  guestEmail: email.trim(),
                  notes: notes.trim(),
                });
                setConfirmed(booking);
              }}
            >
              <button type="button" className="back-link" onClick={() => setSelectedSlot(null)}>
                ← Pick another time
              </button>
              <div className="chosen-slot">{formatDateTime(selectedSlot.toISOString())}</div>

              <label className="field">
                <span>Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="field">
                <span>Anything to share? (optional)</span>
                <textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)} />
              </label>

              <button className="btn btn-primary full" type="submit">
                Confirm booking
              </button>
            </form>
          )}
        </div>
      </div>
      <footer className="public-footer">
        Powered by <button className="link-btn" onClick={() => navigate("/")}>Bookilink</button>
      </footer>
    </div>
  );
}
