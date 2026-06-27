import { useI18n } from "../i18n";
import { PageHeader, PanelCard, ProgressBar, StatusChip, Timeline, WorkspaceHero } from "../components/ui";
import type { PatientSafeCaseView } from "../selectors/visibility";

type Props = {
  item: PatientSafeCaseView;
  activeView: string;
  onAction: (action: string, caseId: string) => void;
};

export const caregiverNav = [
  { id: "overview", label: "Care Overview" },
  { id: "requests", label: "Action Requests" },
  { id: "education", label: "Brain Health Education" },
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
      { id: "complete-form", label: "Help complete patient information", status: item.intakeStatus, done: item.intakeStatus === "Complete", cta: "Open forms" },
      { id: "patient-upload", label: "Help with requested MRI / documents", status: item.mriStatus === "Received" ? "Received" : "Waiting", done: item.mriStatus === "Received", cta: "View uploads" },
      { id: "consent", label: "Review clinical workflow consent", status: item.consentStatus, done: /complete|consented/i.test(item.consentStatus), cta: "Review consent" },
    ];
    return (
      <>
        <PageHeader eyebrow="How you can help" title="Action Requests" description="Tasks your family member may need help completing. These do not produce a diagnosis." />
        <div className="card-grid two">
          {requests.map((request) => (
            <PanelCard key={request.id} title={request.label} action={<StatusChip label={request.done ? "Complete" : request.status} tone={request.done ? "good" : "attention"} />}>
              <p className="context-copy">{request.done ? t("No action needed right now.") : t("Your help may be needed to complete this step.")}</p>
              <button className="secondary-button" onClick={() => onAction(request.id, item.id)}>{t(request.cta)}</button>
            </PanelCard>
          ))}
        </div>
      </>
    );
  }

  if (activeView === "education") return (
    <>
      <PageHeader eyebrow="Brain health & healthy longevity" title="Brain Health Education" description="General educational guidance to support brain health. This is not medical advice or a treatment plan." />
      <div className="card-grid two">
        {EDUCATION_PILLARS.map((pillar) => (
          <PanelCard key={pillar.title} title={pillar.title}><p className="context-copy">{t(pillar.body)}</p></PanelCard>
        ))}
      </div>
      <div className="safe-note"><strong>{t("Educational only")}</strong><p>{t("This content is general brain-health education inspired by lifestyle-prevention programs. Always follow your care team's guidance for this patient.")}</p></div>
    </>
  );

  if (activeView === "followup") return (
    <>
      <PageHeader eyebrow="Next review point" title="Follow-up" description="Follow-up is shown as a safe next step, not as worsening or a treatment recommendation." />
      <PanelCard title={item.followUpStatus} subtitle="The clinic will reach out if anything else is needed.">
        <div className="patient-next-action"><span>{t("How you can help")}</span><strong>{/^scheduled/i.test(item.followUpStatus) ? t("Help keep this review point on the calendar.") : t("No follow-up action is needed right now.")}</strong></div>
        <button className="secondary-button" onClick={() => onAction("ack-followup", item.id)}>{t("Acknowledge reminder")}</button>
      </PanelCard>
    </>
  );

  // Care Overview (default)
  return (
    <>
      <WorkspaceHero
        eyebrow="Caregiver Portal"
        title={t("Supporting {name}", { name: item.patientFirstName })}
        description="A calm view of what is happening, what is needed, and how you can help — using only patient-safe approved information."
        stats={[
          { label: "Care team review", value: reportReleased ? "Completed" : "In progress", detail: reportReleased ? "Summary released" : "Specialist review continuing", tone: reportReleased ? "good" : "info" },
          { label: "Information", value: item.intakeStatus === "Complete" ? "Complete" : "Action needed", detail: "Requested patient information", tone: item.intakeStatus === "Complete" ? "good" : "attention" },
          { label: "Follow-up", value: item.followUpStatus, detail: "Clinic-guided review point", tone: "info" },
        ]}
      />
      <section className="patient-status-card">
        <div><p>{t("Current safe status")}</p><h2>{tv(item.safeStatus)}</h2><span>{t("This case is being managed by the specialist team.")}</span></div>
        <div className="patient-next-action"><span>{t("What is needed")}</span><strong>{tv(item.nextPatientAction)}</strong></div>
      </section>
      <PanelCard title="How you can help" subtitle="Patient-safe requested actions">
        <ProgressBar value={item.patientFormProgress} label="Information completion" />
        <div className="patient-actions">
          <button onClick={() => onAction("complete-form", item.id)}><strong>{t("Help with information")}</strong><span>{t("Check forms and requested details")}</span></button>
          <button onClick={() => onAction("patient-upload", item.id)}><strong>{t("Help with uploads")}</strong><span>{t("MRI and document receipt status")}</span></button>
          <button onClick={() => onAction("support", item.id)}><strong>{t("Contact support")}</strong><span>{t("Prototype placeholder for help")}</span></button>
        </div>
      </PanelCard>
      <PanelCard title="Care timeline" subtitle="Only safe, approved milestones are shown"><Timeline events={item.timeline} patientSafe /></PanelCard>
      <div className="safe-note"><strong>{t("Caregiver visibility")}</strong><p>{t("This portal shows only patient-safe approved information. Technical AI outputs and draft clinical notes are never shown here.")}</p></div>
    </>
  );
}
