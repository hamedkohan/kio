import { useI18n } from "../i18n";
import { Icon } from "./phoneIcons";

export type JourneyStep = { label: string; state: "done" | "current" | "upcoming" };
export type StatTile = { icon: string; label: string; value: string; tone: "good" | "info" | "attention" | "neutral" };

// Greeting row with an initials avatar — the app-home header.
export function AppGreeting({ name, kicker, subtitle }: { name: string; kicker: string; subtitle: string }) {
  const { t, tv } = useI18n();
  const initial = (tv(name) || name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="app-greet">
      <div className="app-avatar" aria-hidden="true">{initial}</div>
      <div className="app-greet-copy">
        <span>{t(kicker)}</span>
        <strong>{tv(name)}</strong>
      </div>
      <p className="app-greet-sub">{t(subtitle)}</p>
    </div>
  );
}

// Gradient status hero with a journey stepper and a single primary next-action CTA.
export function StatusHero({
  eyebrow,
  status,
  latestUpdate,
  steps,
  ctaLabel,
  ctaHint,
  onCta,
}: {
  eyebrow: string;
  status: string;
  latestUpdate?: string;
  steps: JourneyStep[];
  ctaLabel: string;
  ctaHint: string;
  onCta: () => void;
}) {
  const { t, tv } = useI18n();
  return (
    <section className="status-hero">
      <div className="status-hero-glow" aria-hidden="true" />
      <p className="status-hero-eyebrow">{t(eyebrow)}</p>
      <h2 className="status-hero-status">{tv(status)}</h2>
      {latestUpdate ? (
        <p className="status-hero-update"><span>{t("Latest update")}</span>{tv(latestUpdate)}</p>
      ) : null}

      <ol className="hero-stepper" aria-label={t("Care journey")}>
        {steps.map((step, index) => (
          <li key={index} className={`hero-step is-${step.state}`}>
            <span className="hero-step-dot">{step.state === "done" ? <Icon name="consent" className="hero-step-check" /> : null}</span>
            <span className="hero-step-label">{t(step.label)}</span>
          </li>
        ))}
      </ol>

      <button type="button" className="app-cta" onClick={onCta}>
        <span>
          <small>{t("Your next step")}</small>
          <strong>{tv(ctaLabel)}</strong>
        </span>
        <Icon name="arrow" className="app-cta-arrow" />
      </button>
      <p className="status-hero-hint">{t(ctaHint)}</p>
    </section>
  );
}

// 2-column soft stat tiles with an icon, label and value.
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  const { t, tv } = useI18n();
  return (
    <div className="stat-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className={`stat-tile tone-${tile.tone}`}>
          <span className="stat-tile-icon"><Icon name={tile.icon} /></span>
          <span className="stat-tile-label">{t(tile.label)}</span>
          <strong className="stat-tile-value">{tv(tile.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// Section heading with a small leading icon — used to break content into app-like blocks.
export function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h3 className="app-section-label"><Icon name={icon} />{children}</h3>
  );
}
