import { useActions, useStore } from "../store";
import { formatDateTime } from "../slots";

export function BookingsPage() {
  const { bookings, eventTypes } = useStore();
  const { cancelBooking } = useActions();

  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start));
  const now = Date.now();
  const upcoming = sorted.filter((b) => new Date(b.start).getTime() >= now);
  const past = sorted.filter((b) => new Date(b.start).getTime() < now).reverse();

  function typeOf(id: string) {
    return eventTypes.find((e) => e.id === id);
  }

  function renderRow(b: (typeof bookings)[number], isPast: boolean) {
    const et = typeOf(b.eventTypeId);
    return (
      <li key={b.id} className={"booking-row" + (isPast ? " is-past" : "")}>
        <span className="booking-dot" style={{ background: et?.color ?? "#999" }} />
        <div className="booking-main">
          <strong>{b.guestName}</strong>
          <span className="muted"> · {et?.title ?? "Deleted event"}</span>
          <div className="muted small">
            {formatDateTime(b.start)} · {b.durationMin} min · {b.guestEmail}
          </div>
          {b.notes && <div className="booking-notes">“{b.notes}”</div>}
        </div>
        {!isPast && (
          <button
            className="btn btn-ghost danger"
            onClick={() => {
              if (confirm(`Cancel booking with ${b.guestName}?`)) cancelBooking(b.id);
            }}
          >
            Cancel
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="muted">Everyone who has booked time with you.</p>
        </div>
      </div>

      <section>
        <h2 className="section-title">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming bookings yet.</p>
        ) : (
          <ul className="booking-list">{upcoming.map((b) => renderRow(b, false))}</ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="section-title">Past ({past.length})</h2>
          <ul className="booking-list">{past.map((b) => renderRow(b, true))}</ul>
        </section>
      )}
    </div>
  );
}
