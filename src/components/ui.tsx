import type { ReactNode } from "react";
import type { KioCase, TimelineEvent } from "../types";
import { useI18n } from "../i18n";

export function StatusChip({ label, tone }: { label: string; tone?: string }) {
  const { tv } = useI18n();
  const normalized = tone ?? label.toLowerCase();
  let className = "chip chip-neutral";
  if (/reviewed|complete|received|released|ready|acceptable|anonymized|consented|scheduled/.test(normalized)) className = "chip chip-good";
  if (/pending|draft|under|processing|not started|not ready|not scheduled/.test(normalized)) className = "chip chip-pending";
  if (/issue|blocked|missing|action|required|needs|failed|incomplete|rejected|suppressed|invalid/.test(normalized)) className = "chip chip-attention";
  return <span className={className}>{tv(label)}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { tv } = useI18n();
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{tv(eyebrow)}</p>
        <h1>{tv(title)}</h1>
        <p>{tv(description)}</p>
      </div>
      {action ? <div className="page-actions">{action}</div> : null}
    </header>
  );
}

export type WorkspaceHeroStat = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "good" | "attention" | "info";
};

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  stats = [],
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats?: WorkspaceHeroStat[];
  action?: ReactNode;
}) {
  const { tv, formatNumber } = useI18n();
  return (
    <section className="workspace-hero">
      <div className="workspace-hero-copy">
        <p className="eyebrow">{tv(eyebrow)}</p>
        <h1>{tv(title)}</h1>
        <p>{tv(description)}</p>
      </div>
      {stats.length ? (
        <div className="workspace-hero-stats">
          {stats.map((stat) => (
            <div className={`hero-stat hero-stat-${stat.tone ?? "neutral"}`} key={stat.label}>
              <span>{tv(stat.label)}</span>
              <strong>{typeof stat.value === "number" ? formatNumber(stat.value) : tv(stat.value)}</strong>
              {stat.detail ? <small>{tv(stat.detail)}</small> : null}
            </div>
          ))}
        </div>
      ) : null}
      {action ? <div className="workspace-hero-action">{action}</div> : null}
    </section>
  );
}

export function EvidenceSection({
  eyebrow,
  title,
  description,
  children,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { tv } = useI18n();
  return (
    <section className={`evidence-section ${className}`}>
      <div className="evidence-section-header">
        <div>
          {eyebrow ? <p>{tv(eyebrow)}</p> : null}
          <h2>{tv(title)}</h2>
          {description ? <span>{tv(description)}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ActionCluster({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { tv } = useI18n();
  return (
    <div className="action-cluster">
      <div>
        <strong>{tv(title)}</strong>
        {description ? <p>{tv(description)}</p> : null}
      </div>
      <div className="button-row wrap">{children}</div>
    </div>
  );
}

export type EvidenceLayer = {
  label: string;
  status: string;
  detail?: string;
  tone?: "neutral" | "good" | "attention" | "info";
};

export function ReportWorkspaceShell({
  eyebrow,
  title,
  description,
  layers,
  children,
  sidebar,
}: {
  eyebrow: string;
  title: string;
  description: string;
  layers: EvidenceLayer[];
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const { tv } = useI18n();
  return (
    <section className="report-workspace-shell">
      <div className="report-workspace-header">
        <div>
          <p>{tv(eyebrow)}</p>
          <h2>{tv(title)}</h2>
          <span>{tv(description)}</span>
        </div>
        <EvidenceLayerTabs layers={layers} />
      </div>
      <div className={sidebar ? "report-workspace-body with-sidebar" : "report-workspace-body"}>
        <div className="report-workspace-main">{children}</div>
        {sidebar ? <aside className="report-workspace-sidebar">{sidebar}</aside> : null}
      </div>
    </section>
  );
}

export function EvidenceLayerTabs({ layers }: { layers: EvidenceLayer[] }) {
  const { tv } = useI18n();
  return (
    <div className="evidence-layer-tabs" aria-label={tv("Evidence layers")}>
      {layers.map((layer) => (
        <div className={`evidence-layer evidence-layer-${layer.tone ?? "neutral"}`} key={layer.label}>
          <span>{tv(layer.label)}</span>
          <strong>{tv(layer.status)}</strong>
          {layer.detail ? <small>{tv(layer.detail)}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function InteractiveReportPreview({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { tv } = useI18n();
  return (
    <article className="interactive-report-preview">
      <div className="report-preview-spine">
        <span />
        <span />
        <span />
      </div>
      <div className="interactive-report-content">
        <p>{tv("Interactive report workspace")}</p>
        <h3>{tv(title)}</h3>
        <span>{tv(description)}</span>
        {children}
      </div>
    </article>
  );
}

export function ReportReadinessChecklist({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; status: string; detail?: string }>;
}) {
  const { tv } = useI18n();
  return (
    <div className="report-readiness-checklist">
      <strong>{tv(title)}</strong>
      <div>
        {items.map((item) => (
          <div className="report-readiness-row" key={item.label}>
            <span className={inferReadinessClass(item.status)} />
            <div>
              <p>{tv(item.label)}</p>
              {item.detail ? <small>{tv(item.detail)}</small> : null}
            </div>
            <StatusChip label={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function inferReadinessClass(status: string) {
  const text = status.toLowerCase();
  if (/ready|passed|approved|released|available|complete|reviewed/.test(text)) return "ready";
  if (/blocked|failed|invalid|suppressed|missing|not ready|not released/.test(text)) return "blocked";
  return "waiting";
}

export function EvidenceProvenanceStrip({
  items,
}: {
  items: Array<{ label: string; value: string; detail?: string }>;
}) {
  const { tv } = useI18n();
  return (
    <div className="evidence-provenance-strip">
      {items.map((item) => (
        <div key={item.label}>
          <span>{tv(item.label)}</span>
          <strong className="bidi-isolate">{tv(item.value)}</strong>
          {item.detail ? <small>{tv(item.detail)}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function SuppressedEvidenceNotice({
  suppressedCount,
  invalidCount,
  message,
}: {
  suppressedCount?: number;
  invalidCount?: number;
  message?: string;
}) {
  const { t, formatNumber } = useI18n();
  if (!suppressedCount && !invalidCount && !message) return null;
  return (
    <div className="suppressed-evidence-notice">
      <strong>{t("Evidence withheld from normal review")}</strong>
      <p>{message ? t(message) : t("Suppressed or invalid evidence is shown as a safety state, not as a normal report finding.")}</p>
      <div className="button-row wrap">
        {suppressedCount ? <StatusChip label={`${formatNumber(suppressedCount)} ${t("suppressed")}`} tone="attention" /> : null}
        {invalidCount ? <StatusChip label={`${formatNumber(invalidCount)} ${t("invalid")}`} tone="attention" /> : null}
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "good" | "attention" | "info";
}) {
  const { tv, formatNumber } = useI18n();
  return (
    <article className={`metric-card metric-${tone}`}>
      <p>{tv(label)}</p>
      <strong>{typeof value === "number" ? formatNumber(value) : tv(value)}</strong>
      <span>{tv(detail)}</span>
    </article>
  );
}

export function PanelCard({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { tv } = useI18n();
  return (
    <section className={`panel-card ${className}`}>
      <div className="panel-card-header">
        <div>
          <h2>{tv(title)}</h2>
          {subtitle ? <p>{tv(subtitle)}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Timeline({ events, patientSafe = false }: { events: TimelineEvent[]; patientSafe?: boolean }) {
  const { tv, locale } = useI18n();
  const visibleEvents = patientSafe ? events.filter((event) => event.patientSafe) : events;
  return (
    <div className="timeline">
      {visibleEvents.map((event, index) => (
        <div className="timeline-event" key={`${event.label}-${index}`}>
          <span className={`timeline-dot timeline-${event.tone ?? inferTimelineTone(event)}`} />
          <div>
            <strong>{tv(event.label)}</strong>
            <p>{tv(event.detail)}</p>
          </div>
          <time>{formatTimelineDate(event.date, locale, tv)}</time>
        </div>
      ))}
    </div>
  );
}

function inferTimelineTone(event: TimelineEvent) {
  const text = `${event.label} ${event.detail}`.toLowerCase();
  if (/pending|awaiting|waiting|draft|under/.test(text)) return "pending";
  if (/issue|blocked|failed|required|missing/.test(text)) return "attention";
  if (/completed|complete|received|ready|reviewed|released|scheduled|matched|created|opened|submitted|generated/.test(text)) return "good";
  return "default";
}

function formatTimelineDate(date: string, locale: "en" | "fa", tv: (value?: string | number) => string) {
  if (locale !== "fa") return tv(date);
  if (date === "Today" || date === "Now") {
    const formatted = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
    return `${tv("Today")}، ${formatted}`;
  }
  const mockJalaliDates: Record<string, string> = {
    "Jun 09": "۱۹ خرداد ۱۴۰۵",
    "Jun 11": "۲۱ خرداد ۱۴۰۵",
    "Jun 12": "۲۲ خرداد ۱۴۰۵",
    "Jun 13": "۲۳ خرداد ۱۴۰۵",
    "Jun 14": "۲۴ خرداد ۱۴۰۵",
    "May 22": "۱ خرداد ۱۴۰۵",
    "May 24": "۳ خرداد ۱۴۰۵",
    "May 27": "۶ خرداد ۱۴۰۵",
    "May 28": "۷ خرداد ۱۴۰۵",
  };
  return mockJalaliDates[date] ?? tv(date);
}

export function CaseIdentity({ item, anonymized = false }: { item: KioCase; anonymized?: boolean }) {
  const { tv, formatNumber } = useI18n();
  return (
    <div className="case-identity">
      {anonymized ? (
        <span className="avatar avatar-anonymized" dir="ltr">{item.anonymizedId.slice(-2)}</span>
      ) : (
        <GenderAvatar sex={item.sex} label={tv(item.sex)} />
      )}
      <div>
        <strong dir={anonymized ? "ltr" : undefined}>{anonymized ? item.anonymizedId : tv(item.patientName)}</strong>
        <p>{anonymized ? <><span dir="ltr">{item.ageGroup}</span> · {tv(item.sex)}</> : <><span dir="ltr">{item.id}</span> · {formatNumber(item.age)} {tv("years")} · {tv(item.sex)}</>}</p>
      </div>
    </div>
  );
}

function GenderAvatar({ sex, label }: { sex: KioCase["sex"]; label: string }) {
  const isFemale = sex === "Female";
  return (
    <span className={`avatar gender-avatar ${isFemale ? "avatar-female" : "avatar-male"}`} role="img" aria-label={label}>
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle className="avatar-head" cx="16" cy="11.5" r="5.2" />
        {isFemale ? <path className="avatar-hair" d="M9.4 14.3c.4-6.2 3-9.2 6.6-9.2s6.2 3 6.6 9.2c-1.1 1-2.3 1.6-3.8 1.9.6-1 .9-2.1.9-3.3 0-2.7-1.5-4.8-3.7-4.8s-3.7 2.1-3.7 4.8c0 1.2.3 2.3.9 3.3-1.5-.3-2.8-.9-3.8-1.9Z" /> : null}
        <path className="avatar-shoulders" d="M7.6 26.2c.8-5.1 4-8.1 8.4-8.1s7.6 3 8.4 8.1" />
        {isFemale ? <path className="avatar-detail" d="M12 22.4c1.1.7 2.5 1.1 4 1.1s2.9-.4 4-1.1" /> : <path className="avatar-detail" d="M12.2 7.4c1.2-.9 2.5-1.3 3.8-1.3s2.6.4 3.8 1.3" />}
      </svg>
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const { tv, formatNumber } = useI18n();
  return (
    <div className="progress-wrap" aria-label={label ? tv(label) : `${formatNumber(value)}% ${tv("complete")}`}>
      <div className="progress-label"><span>{label ? tv(label) : tv("Progress")}</span><strong dir="ltr">{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function PercentileBar({ value }: { value: number }) {
  return (
    <div className="percentile" dir="ltr">
      <div className="percentile-track">
        <span className="percentile-marker" style={{ insetInlineStart: `calc(${value}% - 5px)` }} />
      </div>
      <span>P{value}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  const { tv } = useI18n();
  return (
    <div className="empty-state">
      <span className="empty-symbol">—</span>
      <h3>{tv(title)}</h3>
      <p>{tv(message)}</p>
      {action}
    </div>
  );
}

export type WorkflowReadinessItem = {
  label: string;
  status: string;
  detail?: string;
};

export function CaseWorkflowSummary({
  stateLabel,
  owner,
  nextAction,
  patientVisibility,
  readiness,
}: {
  stateLabel: string;
  owner: string;
  nextAction: string;
  patientVisibility?: string;
  readiness?: string;
}) {
  const { t, tv } = useI18n();
  return (
    <div className="status-list workflow-summary">
      <div><span>{t("Workflow state")}</span><StatusChip label={stateLabel} /></div>
      <div><span>{t("Step owner")}</span><strong>{tv(owner)}</strong></div>
      <div><span>{t("Next permitted action")}</span><strong>{tv(nextAction)}</strong></div>
      {patientVisibility ? <div><span>{t("Portal visibility")}</span><StatusChip label={patientVisibility} /></div> : null}
      {readiness ? <div><span>{t("Readiness")}</span><StatusChip label={readiness} /></div> : null}
    </div>
  );
}

export function WorkflowReadinessPanel({ items }: { items: WorkflowReadinessItem[] }) {
  const { t, tv } = useI18n();
  return (
    <div className="status-list readiness-panel">
      {items.map((item) => (
        <div key={item.label}>
          <span>{t(item.label)}</span>
          <StatusChip label={item.status} />
          {item.detail ? <small>{tv(item.detail)}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function CaseBlockerList({ blockers, empty = "No blocker is currently recorded." }: { blockers: string[]; empty?: string }) {
  const { t, tv } = useI18n();
  if (!blockers.length) return <div className="quiet-summary compact workflow-empty"><StatusChip label="Ready" /><p>{t(empty)}</p></div>;
  return (
    <div className="case-blocker-list">
      <strong>{t("Blocked or waiting")}</strong>
      <ul>{blockers.map((blocker) => <li key={blocker}>{tv(blocker)}</li>)}</ul>
    </div>
  );
}

export function ImagingPlaceholder({ label, annotated = false }: { label: string; annotated?: boolean }) {
  const { tv } = useI18n();
  return (
    <div className={`imaging-placeholder ${annotated ? "imaging-annotated" : ""}`}>
      <div className="scan-shape">
        <span />
        <span />
        <i />
      </div>
      <div className="scan-caption">
        <strong>{tv(label)}</strong>
        <span>{tv("Prototype placeholder · not a diagnostic image")}</span>
      </div>
    </div>
  );
}

export function CaseLifecycleStrip({ item }: { item: KioCase }) {
  const { tv } = useI18n();
  const hasMri = item.mriStatus === "Received" || item.mriStatus === "Quality issue";
  const imageQualityStatus = !hasMri ? "Waiting for MRI" : item.imageQuality === "Acceptable" ? "Checked" : item.imageQuality;
  const aiProcessingStatus = item.aiStatus === "AI output ready" ? "Completed" : item.aiStatus;
  const aiOutputStatus = item.aiStatus === "AI output ready" ? "Ready" : item.aiStatus === "Blocked" ? "Blocked" : "Not ready";
  const steps = [
    { label: "Case Created", status: "Created" },
    { label: "Intake", status: item.intakeStatus === "Complete" ? "Complete" : "Action needed" },
    { label: "MRI Received", status: hasMri ? item.mriStatus : "Waiting" },
    { label: "Image Quality Check", status: imageQualityStatus },
    { label: "AI Processing", status: aiProcessingStatus },
    { label: "AI Output Ready", status: aiOutputStatus },
    { label: "Radiologist Review", status: item.radiologistStatus },
    { label: "Physician Review", status: item.neurologistStatus },
    { label: "Report / Release", status: item.releaseStatus === "Not released" ? item.reportStatus : item.releaseStatus },
    { label: "Follow-up", status: item.followUpStatus },
  ];

  return (
    <div className="workflow-strip">
      {steps.map((step) => (
        <div key={step.label}>
          <span>{tv(step.label)}</span>
          <StatusChip label={step.status} />
        </div>
      ))}
    </div>
  );
}
