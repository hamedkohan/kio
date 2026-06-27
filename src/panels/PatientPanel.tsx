import { useI18n } from "../i18n";
import { EvidenceLayerTabs, InteractiveReportPreview, PageHeader, PanelCard, ProgressBar, ReportReadinessChecklist, StatusChip, Timeline, WorkspaceHero } from "../components/ui";
import type { PatientSafeCaseView } from "../selectors/visibility";

type Props = {
  item: PatientSafeCaseView;
  activeView: string;
  onAction: (action: string, caseId: string) => void;
};

export const patientNav = [
  { id: "status", label: "My Case Status" },
  { id: "forms", label: "Forms" },
  { id: "uploads", label: "Uploads" },
  { id: "consent", label: "Consent" },
  { id: "followup", label: "Follow-up Reminder" },
];

export function PatientPanel({ item, activeView, onAction }: Props) {
  const { t, tv } = useI18n();
  const reportReleased = item.reportAvailable;

  if (activeView === "forms") return (
    <>
      <PageHeader eyebrow="Your information" title="Forms" description="Complete the information requested by your care team. These forms do not produce a diagnosis." />
      <PanelCard title="Cognitive history form" subtitle="You can save and continue later"><ProgressBar value={item.patientFormProgress} label="Form completion" /><div className="form-grid"><label>{t("Memory concerns")}<textarea defaultValue={t("I have noticed increasing reliance on reminders.")} /></label><label>{t("Daily activities")}<textarea defaultValue={t("I remain independent in daily activities.")} /></label><label>{t("Caregiver observations")}<textarea defaultValue={t("Only patient-safe submitted information is shown in this portal view.")} /></label><label>{t("Family history")}<select defaultValue="not-sure"><option value="not-sure">{t("Not sure")}</option><option>{t("Yes")}</option><option>{t("No")}</option></select></label></div><button className="primary-button" onClick={() => onAction("complete-form", item.id)}>{t("Submit information")}</button></PanelCard>
    </>
  );

  if (activeView === "uploads") return (
    <>
      <PageHeader eyebrow="Secure files" title="Uploads" description="Upload only the MRI or documents requested by your clinic." />
      <div className="split-layout">
        <PanelCard title="MRI status" action={<StatusChip label={item.mriStatus === "Received" ? "MRI received" : "MRI needed"} />}><div className="upload-zone"><strong>{item.mriStatus === "Received" ? t("Your MRI has been received.") : t("Upload the requested MRI")}</strong><p>{t("Your specialist team will review the file. Technical and clinical details are not shown here.")}</p><button className="secondary-button" onClick={() => onAction("patient-upload", item.id)}>{item.mriStatus === "Received" ? t("View upload receipt") : t("Choose file")}</button></div></PanelCard>
        <PanelCard title="Documents"><div className="file-list"><div><span>Referral letter.pdf</span><StatusChip label="Received" /></div><div><span>Prior report.pdf</span><StatusChip label="Received" /></div></div></PanelCard>
      </div>
    </>
  );

  if (activeView === "consent") return (
    <>
      <PageHeader eyebrow="Your choices" title="Consent" description="Clinical workflow consent and optional research participation are shown separately." />
      <div className="card-grid two"><PanelCard title="Clinical workflow consent" action={<StatusChip label={item.consentStatus} />}><p className="context-copy">{t("Required to continue the requested care workflow.")}</p><button className="primary-button" onClick={() => onAction("consent", item.id)}>{t("Review consent")}</button></PanelCard><PanelCard title="Optional research participation" action={<StatusChip label={item.researchConsentStatus} />}><p className="context-copy">{t("Research participation is optional and uses governed anonymized data. Research results are not shown here.")}</p><button className="secondary-button" onClick={() => onAction("research-consent", item.id)}>{t("Manage choice")}</button></PanelCard></div>
    </>
  );

  if (activeView === "followup") return (
    <>
      <PageHeader eyebrow="Next review point" title="Follow-up Reminder" description="Follow-up is shown as a safe next step, not as worsening or a treatment recommendation." />
      <PanelCard title={item.followUpStatus} subtitle="Your clinic will contact you if any additional action is needed."><div className="patient-next-action"><span>{t("What you need to do")}</span><strong>{/^scheduled/i.test(item.followUpStatus) ? t("Keep this review point on your calendar.") : t("No follow-up action is needed right now.")}</strong></div><button className="secondary-button" onClick={() => onAction("ack-followup", item.id)}>{t("Acknowledge reminder")}</button></PanelCard>
      <PanelCard title="Follow-up coordination" subtitle="Placeholder · status-only prototype">
        <div className="status-list"><div><span>{t("Coordination mode")}</span><StatusChip label="Clinic managed" /></div><div><span>{t("Scheduling editor")}</span><StatusChip label="Not active in prototype" /></div><div><span>{t("Clinical meaning")}</span><StatusChip label="Discuss with care team" /></div></div>
        <div className="safe-note"><strong>{t("Safe follow-up boundary")}</strong><p>{t("Kio shows review coordination only. It does not provide treatment recommendations or interpret worsening.")}</p></div>
      </PanelCard>
    </>
  );

  return (
    <>
      <WorkspaceHero
        eyebrow="Patient Portal"
        title={t("Hello, {name}", { name: item.patientFirstName })}
        description="A calm view of what is happening, what is needed from you, and what your care team has approved for this portal."
        stats={[
          { label: "Care team review", value: reportReleased ? "Completed" : "In progress", detail: reportReleased ? "Summary released" : "Specialist review is continuing", tone: reportReleased ? "good" : "info" },
          { label: "Patient-safe release", value: reportReleased ? "Available" : "Not yet released", detail: "Only approved content appears here", tone: reportReleased ? "good" : "info" },
          { label: "Technical details", value: "Care-team only", detail: "Reviewed before any plain-language release", tone: "neutral" },
        ]}
      />
      <section className="patient-status-card">
        <div><p>{t("Current safe status")}</p><h2>{tv(item.safeStatus)}</h2><span>{t("Your case is being managed by the specialist team.")}</span></div>
        <div className="patient-next-action"><span>{t("Your next action")}</span><strong>{tv(item.nextPatientAction)}</strong></div>
      </section>
      <div className="metric-grid patient-metrics"><div className="patient-metric"><span>{t("Information")}</span><StatusChip label={item.intakeStatus === "Complete" ? "Complete" : "Action needed"} /></div><div className="patient-metric"><span>{t("MRI")}</span><StatusChip label={item.mriStatus === "Received" ? "Received" : "Waiting"} /></div><div className="patient-metric"><span>{t("Report")}</span><StatusChip label={reportReleased ? "Available" : "Not available yet"} /></div><div className="patient-metric"><span>{t("Follow-up")}</span><StatusChip label={item.followUpStatus} /></div></div>
      {reportReleased ? (
        <section className="patient-report-package">
          <div>
            <p className="eyebrow">{t("Patient-safe released report")}</p>
            <h2>{tv(item.releaseTitle ?? "Specialist-reviewed summary")}</h2>
            <p>{item.approvedSummary ? tv(item.approvedSummary) : t("Your specialist-reviewed summary is available.")}</p>
          </div>
          <EvidenceLayerTabs layers={[
            { label: "Care team review", status: "Completed", detail: "Reviewed before release", tone: "good" },
            { label: "Technical details", status: "Care-team only", detail: "Not patient-facing" },
            { label: "Draft clinical notes", status: "Not shown", detail: "Only approved wording appears" },
            { label: "Follow-up", status: item.followUpStatus, detail: "Clinic-guided", tone: "info" },
          ]} />
          <InteractiveReportPreview title="Plain-language release package" description="This is the patient-safe layer created from reviewed evidence, not a raw technical report.">
            {item.approvedRelease ? (
              <div className="context-list">
                <div><span>{t("What was reviewed")}</span><p>{tv(item.approvedRelease.whatWasReviewed)}</p></div>
                <div><span>{t("What this means")}</span><p>{tv(item.approvedRelease.whatThisMeans)}</p></div>
                <div><span>{t("Limitations in plain language")}</span><p>{item.approvedRelease.limitationsInPlainLanguage.length ? item.approvedRelease.limitationsInPlainLanguage.map((limitation) => tv(limitation)).join(". ") : t("No plain-language limitation was included in this release package.")}</p></div>
                <div><span>{t("Recommended next steps")}</span><p>{item.approvedRelease.recommendedNextSteps.length ? item.approvedRelease.recommendedNextSteps.map((step) => tv(step)).join(". ") : t("No patient-facing next step has been included.")}</p></div>
                <div><span>{t("Follow-up instructions")}</span><p>{item.approvedRelease.followUpInstructions.length ? item.approvedRelease.followUpInstructions.map((instruction) => tv(instruction)).join(". ") : t("No follow-up instruction is included in the release package.")}</p></div>
                {item.approvedRelease.caregiverNotes.length ? <div><span>{t("Caregiver note")}</span><p>{item.approvedRelease.caregiverNotes.map((note) => tv(note)).join(". ")}</p></div> : null}
              </div>
            ) : (
              <p>{t("Your specialist-reviewed summary is available.")}</p>
            )}
          </InteractiveReportPreview>
          <div className="safe-note"><strong>{t("Discuss with your care team")}</strong><p>{t("This portal shows only approved summary information. It does not provide technical AI outputs or treatment recommendations.")}</p></div>
        </section>
      ) : (
        <PanelCard title="Report status" subtitle="No report content is shown before release">
          <ReportReadinessChecklist title="Patient-safe release path" items={[
            { label: "Care team review", status: "In progress", detail: "Your care team is reviewing your imaging results." },
            { label: "Patient-safe approval", status: "Not released", detail: "Only reviewed and approved wording appears here." },
            { label: "Technical report layers", status: "Care-team only", detail: "They are reviewed before plain-language release." },
            { label: "Draft clinical notes", status: "Not shown", detail: "Draft content is never shown here." },
          ]} />
          <div className="patient-next-action"><span>{t("What this means")}</span><strong>{t("Your report will appear here only after specialist approval and release.")}</strong></div>
          <div className="safe-note"><strong>{t("Still under review")}</strong><p>{t("Your care team is reviewing your imaging results. Technical AI outputs and draft clinical notes are not shown here.")}</p></div>
        </PanelCard>
      )}
      <div className="split-layout">
        <PanelCard title="Your case timeline" subtitle="Only safe, approved milestones are shown"><Timeline events={item.timeline} patientSafe /></PanelCard>
        <PanelCard title="Helpful actions"><div className="patient-actions"><button onClick={() => onAction("complete-form", item.id)}><strong>{t("Review your information")}</strong><span>{t("Check forms and requested details")}</span></button><button onClick={() => onAction("patient-upload", item.id)}><strong>{t("View uploads")}</strong><span>{t("See MRI and document receipt status · placeholder receipt")}</span></button><button onClick={() => onAction("support", item.id)}><strong>{t("Contact support")}</strong><span>{t("Prototype placeholder for upload or required-action help")}</span></button></div></PanelCard>
      </div>
      <PanelCard title="Caregiver access" subtitle="Placeholder · permission model not active in this prototype">
        <div className="status-list"><div><span>{t("Caregiver status")}</span><StatusChip label="Not configured" /></div><div><span>{t("Visible health information")}</span><StatusChip label="Patient-approved only" /></div><div><span>{t("Invite / revoke workflow")}</span><StatusChip label="Placeholder only" /></div></div>
        <p className="context-copy">{t("Caregiver permission management is intentionally not active in this prototype. This section only marks where a governed access model would appear.")}</p>
      </PanelCard>
    </>
  );
}
