import { useState } from "react";
import { useActions } from "../store";
import type { EventType, Weekday } from "../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#4f46e5", "#0d9488", "#db2777", "#ea580c", "#2563eb", "#7c3aed"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTimeInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function fromTimeInput(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

export function EventTypeEditor({
  eventType,
  onClose,
}: {
  eventType: EventType | null;
  onClose: () => void;
}) {
  const { upsertEventType } = useActions();
  const [title, setTitle] = useState(eventType?.title ?? "");
  const [slug, setSlug] = useState(eventType?.slug ?? "");
  const [description, setDescription] = useState(eventType?.description ?? "");
  const [durationMin, setDurationMin] = useState(eventType?.durationMin ?? 30);
  const [color, setColor] = useState(eventType?.color ?? COLORS[0]);
  const [days, setDays] = useState<Weekday[]>(eventType?.availability.days ?? [1, 2, 3, 4, 5]);
  const [startMin, setStartMin] = useState(eventType?.availability.startMin ?? 9 * 60);
  const [endMin, setEndMin] = useState(eventType?.availability.endMin ?? 17 * 60);

  const effectiveSlug = slug || slugify(title);
  const valid = title.trim() && effectiveSlug && days.length > 0 && endMin > startMin;

  function toggleDay(d: Weekday) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function submit() {
    if (!valid) return;
    upsertEventType({
      id: eventType?.id,
      title: title.trim(),
      slug: effectiveSlug,
      description: description.trim(),
      durationMin,
      color,
      availability: { days, startMin, endMin },
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{eventType ? "Edit event type" : "New event type"}</h2>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro call" />
        </label>

        <label className="field">
          <span>Link slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder={slugify(title) || "intro-call"}
          />
          <small className="muted">/book/{effectiveSlug || "…"}</small>
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A quick chat to get to know each other."
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Duration (min)</span>
            <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {[15, 30, 45, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Color</span>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={"swatch" + (c === color ? " is-active" : "")}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
          </label>
        </div>

        <div className="field">
          <span>Available days</span>
          <div className="day-toggles">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={"day-toggle" + (days.includes(i as Weekday) ? " is-active" : "")}
                onClick={() => toggleDay(i as Weekday)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Day starts</span>
            <input
              type="time"
              value={toTimeInput(startMin)}
              onChange={(e) => setStartMin(fromTimeInput(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Day ends</span>
            <input
              type="time"
              value={toTimeInput(endMin)}
              onChange={(e) => setEndMin(fromTimeInput(e.target.value))}
            />
          </label>
        </div>

        {!valid && <p className="warn">Add a title, at least one day, and a valid time window.</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
