import { useI18n, type Locale } from "../i18n";
import { Icon } from "./phoneIcons";
import { PageHeader, PanelCard } from "./ui";

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

// Personal "Account" tab for the mobile portals: language, help, and sign out —
// the settings a patient/caregiver expects in their own space. `children` lets a
// portal add its own settings sections (e.g. the patient's caregiver access).
export function AccountView({ onLogout, onContact, children }: { onLogout: () => void; onContact: () => void; children?: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const languages: Array<{ code: Locale; label: string }> = [
    { code: "en", label: "English" },
    { code: "fa", label: "فارسی" },
  ];
  return (
    <>
      <PageHeader eyebrow="You" title="Account" description="Your language, help, and sign out." />
      <PanelCard title="Language" subtitle="Choose how the portal is shown">
        <div className="account-lang">
          {languages.map((lang) => (
            <button key={lang.code} type="button" className={locale === lang.code ? "active" : ""} aria-pressed={locale === lang.code} onClick={() => setLocale(lang.code)}>
              {lang.label}
            </button>
          ))}
        </div>
      </PanelCard>
      <PanelCard title="Help">
        <div className="patient-actions">
          <button type="button" onClick={onContact}><strong>{t("Contact support")}</strong><span>{t("Get help with a requested step")}</span></button>
        </div>
      </PanelCard>
      {children}
      <button type="button" className="account-logout" onClick={onLogout}>{t("Log out")}</button>
      <p className="account-meta">{t("Kio · patient-safe portal")} · {t("Mock data only")}</p>
    </>
  );
}
