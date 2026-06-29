import { useState } from "react";
import { useActions, useStore } from "../store";
import { publicLink } from "../router";
import type { EventType, Weekday } from "../types";
import { EventTypeEditor } from "../components/EventTypeEditor";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const link = publicLink(slug);
  return (
    <button
      className="btn btn-ghost copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
        } catch {
          // clipboard may be unavailable; ignore
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={link}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export function Dashboard() {
  const { eventTypes, bookings } = useStore();
  const { deleteEventType } = useActions();
  const [editing, setEditing] = useState<EventType | "new" | null>(null);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Event types</h1>
          <p className="muted">Create a meeting type, then share its link.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          + New event type
        </button>
      </div>

      <div className="card-grid">
        {eventTypes.map((et) => {
          const count = bookings.filter((b) => b.eventTypeId === et.id).length;
          return (
            <article key={et.id} className="card" style={{ borderTopColor: et.color }}>
              <div className="card-body">
                <div className="card-title-row">
                  <h3>{et.title}</h3>
                  <span className="pill">{et.durationMin} min</span>
                </div>
                <p className="muted card-desc">{et.description || "No description"}</p>
                <div className="meta-row">
                  <span className="meta">
                    {(et.availability.days as Weekday[]).map((d) => DAY_LABELS[d]).join(", ") || "No days"}
                  </span>
                  <span className="meta">
                    {minToLabel(et.availability.startMin)}–{minToLabel(et.availability.endMin)}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta">{count} booking{count === 1 ? "" : "s"}</span>
                  <code className="slug">/{et.slug}</code>
                </div>
              </div>
              <div className="card-actions">
                <CopyLink slug={et.slug} />
                <a className="btn btn-ghost" href={`#/book/${et.slug}`} target="_blank" rel="noreferrer">
                  Preview
                </a>
                <button className="btn btn-ghost" onClick={() => setEditing(et)}>
                  Edit
                </button>
                <button
                  className="btn btn-ghost danger"
                  onClick={() => {
                    if (confirm(`Delete "${et.title}"? Its bookings will be removed too.`)) {
                      deleteEventType(et.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}

        {eventTypes.length === 0 && (
          <div className="empty">
            <p>No event types yet.</p>
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              Create your first one
            </button>
          </div>
        )}
      </div>

      {editing && (
        <EventTypeEditor
          eventType={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
