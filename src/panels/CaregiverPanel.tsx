import { useI18n } from "../i18n";
import { PageHeader, PanelCard, StatusChip, Timeline } from "../components/ui";
import { AppGreeting, StatTiles, StatusHero, type JourneyStep, type StatTile } from "../components/MobileHome";
import type { PatientSafeCaseView } from "../selectors/visibility";

function buildSteps(flags: boolean[], labels: string[]): JourneyStep[] {
  let currentSet = false;
  return labels.map((label, index) => {
    if (flags[index]) return { label, state: "done" };
    if (!currentSet) { currentSet = true; return { label, state: "current" }; }
    return { label, state: "upcoming" };
  });
}

function latestSafeEvent(item: PatientSafeCaseView) {
  const safe = item.timeline.filter((event) => event.patientSafe);
  return safe.length ? safe[safe.length - 1] : undefined;
}

type Props = {
  item: PatientSafeCaseView;
  activeView: string;
  onAction: (action: string, caseId: string) => void;
};

export const caregiverNav = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Requests" },
  { id: "education", label: "Education" },
  { id: "followup", label: "Follow-up" },
];

// Brain-health lifestyle pillars (LEAP-inspired reference, educational only — not medical advice).
const EDUCATION_PILLARS = [
  { title: "Physical activity", body: "Regular aerobic and strength activity supports brain health. Discuss a safe routine with the care team." },
  { title: "Cognitive engagement", body: "Stay socially and mentally active with meaningful, enjoyable activities." },
  { title: "Sleep", body: "Consistent, good-quality sleep supports memory and overall brain health." },
  { title: "Nutrition", body: "A balanced, heart-healthy eating pattern is associated with better brain health." },
  { title: "Vascular health", body: "Managing blood pressure, sugar, and cholesterol with the clinic protects the brain." },
];

export function CaregiverPanel({ item, activeView, onAction }: Props) {
  const { t, tv } = useI18n();
  const reportReleased = item.reportAvailable;

  if (activeView === "requests") {
    const requests = [
      { id: "complete-form", label: "Help with the information form", status: item.intakeStatus, done: item.intakeStatus === "Complete", cta: "Open forms" },
      { id: "patient-upload", label: "Help with the MRI or documents", status: item.mriStatus === "Received" ? "Received" : "Waiting", done: item.mriStatus === "Received", cta: "View uploads" },
      { id: "consent", label: "Review the requested consent", status: item.consentStatus, done: /complete|consented/i.test(item.consentStatus), cta: "Review consent" },
    ];
    const openCount = requests.filter((request) => !request.done).length;
    const helpLine = openCount === 0
      ? t("Nothing needs your help right now.")
      : openCount === 1
        ? t("One step may need your help.")
        : t("{count} steps may need your help.").replace("{count}", String(openCount));
    return (
      <>
        <PageHeader eyebrow="How you can help" title="Action requests" description="Steps your family member may need a hand with. These do not produce a diagnosis." />
        <div className="patient-next-action"><span>{t("Right now")}</span><strong>{helpLine}</strong></div>
        <div className="card-grid two">
          {requests.map((request) => (
            <PanelCard key={request.id} title={request.label} action={<StatusChip label={request.done ? "Done" : request.status} tone={request.done ? "good" : "attention"} />}>
              <p className="context-copy">{request.done ? t("All set — nothing needed here.") : t("Your help may be needed to complete this step.")}</p>
              <button className="secondary-button" onClick={() => onAction(request.id, item.id)}>{t(request.cta)}</button>
            </PanelCard>
          ))}
        </div>
        <div className="safe-note"><strong>{t("You'll be kept informed")}</strong><p>{t("The clinic guides each step. You'll be notified when something needs attention.")}</p></div>
      </>
    );
  }

  if (activeView === "education") return (
    <>
      <PageHeader eyebrow="Brain health & healthy longevity" title="Brain health education" description="Simple, everyday ways to support brain health. This is not medical advice or a treatment plan." />
      <div className="card-grid two">
        {EDUCATION_PILLARS.map((pillar) => (
          <PanelCard key={pillar.title} title={pillar.title}><p className="context-copy">{t(pillar.body)}</p></PanelCard>
        ))}
      </div>
      <div className="safe-note"><strong>{t("General guidance only")}</strong><p>{t("This is general brain-health education to support your family member. It isn't a diagnosis or treatment plan — always follow the care team's guidance.")}</p></div>
    </>
  );

  if (activeView === "followup") {
    const scheduled = /^scheduled/i.test(item.followUpStatus);
    return (
      <>
        <PageHeader eyebrow="Next review point" title="Follow-up" description="Follow-up is shown as a safe next step, not as a diagnosis or treatment recommendation." />
        <PanelCard title={scheduled ? item.followUpStatus : "No follow-up is scheduled yet."} subtitle="Your clinic will contact the patient if a follow-up is needed.">
          <div className="patient-next-action"><span>{t("How you can help")}</span><strong>{scheduled ? t("Help keep this review point on the calendar.") : t("No follow-up action is needed from you right now.")}</strong></div>
          <button className="secondary-button" onClick={() => onAction("support", item.id)}>{t("Contact clinic")}</button>
        </PanelCard>
      </>
    );
  }

  // Care Overview (default)
  const intakeDone = item.intakeStatus === "Complete";
  const mriDone = item.mriStatus === "Received";
  const followupScheduled = /^scheduled/i.test(item.followUpStatus);
  const steps = buildSteps(
    [intakeDone, mriDone, reportReleased, reportReleased, followupScheduled],
    ["Information", "Imaging", "Specialist review", "Report", "Follow-up"],
  );
  const ctaAction = !intakeDone ? "complete-form" : !mriDone ? "patient-upload" : !/complete|consented/i.test(item.consentStatus) ? "consent" : "support";
  const tiles: StatTile[] = [
    { icon: "forms", label: "Information", value: intakeDone ? "Complete" : "Action needed", tone: intakeDone ? "good" : "attention" },
    { icon: "scan", label: "MRI", value: mriDone ? "Received" : "Waiting", tone: mriDone ? "good" : "info" },
    { icon: "report", label: "Report", value: reportReleased ? "Available" : "In review", tone: reportReleased ? "good" : "info" },
    { icon: "calendar", label: "Follow-up", value: item.followUpStatus, tone: followupScheduled ? "good" : "info" },
  ];

  const latest = latestSafeEvent(item);

  return (
    <>
      <AppGreeting name={item.patientFirstName} kicker="Caregiver Portal" subtitle="Supporting your family member — what's done, what's next, and how you can help." />
      <StatusHero
        eyebrow="Care status"
        status={item.safeStatus}
        latestUpdate={latest ? (latest.detail || latest.label) : undefined}
        steps={steps}
        ctaLabel={item.nextPatientAction}
        ctaHint="You see the approved, patient-safe information the care team has shared."
        onCta={() => onAction(ctaAction, item.id)}
      />
      <StatTiles tiles={tiles} />
      <PanelCard title="How you can help" subtitle="Steps your family member may need a hand with">
        <div className="patient-actions">
          <button onClick={() => onAction("complete-form", item.id)}><strong>{t("Help with information")}</strong><span>{t("Check forms and requested details")}</span></button>
          <button onClick={() => onAction("patient-upload", item.id)}><strong>{t("Help with uploads")}</strong><span>{t("See MRI and document receipts")}</span></button>
          <button onClick={() => onAction("support", item.id)}><strong>{t("Contact support")}</strong><span>{t("Get help with a requested step")}</span></button>
        </div>
      </PanelCard>
      <PanelCard title="Care timeline" subtitle="Milestones the care team has shared">
        {latest ? <p className="timeline-updated">{t("Last updated")} {tv(latest.date)}</p> : null}
        <Timeline events={item.timeline} patientSafe />
      </PanelCard>
      <div className="safe-note"><strong>{t("What you can see here")}</strong><p>{t("You see the approved, patient-safe information the care team has shared. Working notes stay with the care team during review.")}</p></div>
    </>
  );
}
