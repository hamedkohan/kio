import { useI18n } from "../i18n";
import { EvidenceLayerTabs, InteractiveReportPreview, PageHeader, PanelCard, ProgressBar, ReportReadinessChecklist, StatusChip, Timeline } from "../components/ui";
import { AccountView, AppGreeting, StatTiles, StatusHero, type JourneyStep, type StatTile } from "../components/MobileHome";
import type { PatientSafeCaseView } from "../selectors/visibility";

function buildSteps(flags: boolean[], labels: string[]): JourneyStep[] {
  let currentSet = false;
  return labels.map((label, index) => {
    if (flags[index]) return { label, state: "done" };
    if (!currentSet) { currentSet = true; return { label, state: "current" }; }
    return { label, state: "upcoming" };
  });
}

// The most recent milestone the care team has shared — powers "Latest update".
function latestSafeEvent(item: PatientSafeCaseView) {
  const safe = item.timeline.filter((event) => event.patientSafe);
  return safe.length ? safe[safe.length - 1] : undefined;
}

// Plain-language guidance for the top of the portal: what to do now, what comes
// next, and how the patient will be informed — derived from the case state.
function patientGuidance(item: PatientSafeCaseView) {
  const intakeDone = item.intakeStatus === "Complete";
  const mriDone = item.mriStatus === "Received";
  const consented = /complete|consented/i.test(item.consentStatus);
  if (!intakeDone) return {
    doNow: "Complete the information form your clinic requested.",
    next: "Once your information is complete, your clinic arranges your MRI.",
    notify: "You'll be notified when your next step is ready.",
  };
  if (!mriDone) return {
    doNow: "Nothing right now — your clinic is arranging your MRI. We'll let you know if anything is needed from you.",
    next: "When your MRI is received, your specialist team begins their review.",
    notify: "You'll be notified when your MRI has been received.",
  };
  if (!consented) return {
    doNow: "Review and provide the requested consent so your care can continue.",
    next: "After consent, your specialist team reviews your imaging.",
    notify: "You'll be notified when your report is ready.",
  };
  if (!item.reportAvailable) return {
    doNow: "Nothing right now — your care team is reviewing your results.",
    next: "Your approved report will appear here after specialist review.",
    notify: "You'll be notified when your report is available.",
  };
  return {
    doNow: "You can view your approved summary below.",
    next: "Your clinic will contact you if a follow-up is needed.",
    notify: "You'll be notified if there's a new update or a follow-up.",
  };
}

type Props = {
  item: PatientSafeCaseView;
  activeView: string;
  onAction: (action: string, caseId: string) => void;
  onLogout: () => void;
};

export const patientNav = [
  { id: "status", label: "Home" },
  { id: "tasks", label: "Tasks" },
  { id: "followup", label: "Follow-up" },
  { id: "account", label: "Account" },
];

export function PatientPanel({ item, activeView, onAction, onLogout }: Props) {
  const { t, tv } = useI18n();
  const reportReleased = item.reportAvailable;
  const formComplete = item.patientFormProgress >= 100;

  if (activeView === "account") return (
    <AccountView onLogout={onLogout} onContact={() => onAction("support", item.id)}>
      <PanelCard title="Caregiver access" subtitle="Not enabled for this case">
        <div className="status-list">
          <div><span>{t("Caregiver status")}</span><StatusChip label="Not enabled" /></div>
          <div><span>{t("Shared information")}</span><StatusChip label="Approved information only" /></div>
          <div><span>{t("Access control")}</span><StatusChip label="Managed by care team" /></div>
        </div>
        <p className="context-copy">{t("Your clinic can enable caregiver access when appropriate. Only approved patient-safe information would be shared.")}</p>
      </PanelCard>
    </AccountView>
  );

  // Tasks — everything the clinic has asked for, in one place: form, uploads, consent.
  if (activeView === "tasks") {
    const consented = /complete|consented/i.test(item.consentStatus);
    const openCount = [formComplete, item.mriStatus === "Received", consented].filter((done) => !done).length;
    return (
      <>
        <PageHeader eyebrow="Your to-do" title="Tasks" description="Everything your clinic has asked for, in one place. These do not produce a diagnosis." />
        <div className="patient-next-action"><span>{t("Right now")}</span><strong>{openCount === 0 ? t("You're all caught up — nothing to complete.") : openCount === 1 ? t("One item still needs you.") : t("{count} items still need you.").replace("{count}", String(openCount))}</strong></div>

        <PanelCard title="Cognitive history form" subtitle={formComplete ? "Submitted — you can review or update your answers" : "You can save and continue later"} action={<StatusChip label={formComplete ? "Submitted" : "Action needed"} tone={formComplete ? "good" : "attention"} />}>
          <ProgressBar value={item.patientFormProgress} label="Form completion" />
          <div className="form-grid">
            <label>{t("Memory concerns")}<textarea defaultValue={t("I have noticed increasing reliance on reminders.")} /></label>
            <label>{t("Daily activities")}<textarea defaultValue={t("I remain independent in daily activities.")} /></label>
            <label>{t("Caregiver observations")}<textarea defaultValue={t("Add anything a family member has noticed, if helpful.")} /></label>
            <label>{t("Family history")}<select defaultValue="not-sure"><option value="not-sure">{t("Not sure")}</option><option>{t("Yes")}</option><option>{t("No")}</option></select></label>
          </div>
          <button className="primary-button" onClick={() => onAction("complete-form", item.id)}>{formComplete ? t("Update information") : t("Submit information")}</button>
        </PanelCard>

        <PanelCard title="MRI & documents" action={<StatusChip label={item.mriStatus === "Received" ? "MRI received" : "MRI needed"} tone={item.mriStatus === "Received" ? "good" : "info"} />}>
          <div className="upload-zone">
            <strong>{item.mriStatus === "Received" ? t("Your MRI has been received.") : t("Upload the requested MRI")}</strong>
            <p>{item.mriStatus === "Received" ? t("Your specialist team will review the file before any report is shared.") : t("Your clinic will let you know if an MRI upload is needed from you.")}</p>
            <button className="secondary-button" onClick={() => onAction("patient-upload", item.id)}>{item.mriStatus === "Received" ? t("View upload receipt") : t("Choose file")}</button>
          </div>
          <div className="file-list"><div><span>Referral letter.pdf</span><StatusChip label="Received" tone="good" /></div><div><span>Prior report.pdf</span><StatusChip label="Received" tone="good" /></div></div>
        </PanelCard>

        <PanelCard title="Clinical workflow consent" action={<StatusChip label={item.consentStatus} />}><p className="context-copy">{t("Required to continue your requested care workflow.")}</p><button className="primary-button" onClick={() => onAction("consent", item.id)}>{t("Review consent")}</button></PanelCard>
        <PanelCard title="Optional research participation" action={<StatusChip label={item.researchConsentStatus} />}><p className="context-copy">{t("Optional. Uses governed anonymized data where permitted. Research results are not shown in this portal.")}</p><button className="secondary-button" onClick={() => onAction("research-consent", item.id)}>{t("Manage choice")}</button></PanelCard>
      </>
    );
  }

  if (activeView === "followup") {
    const scheduled = /^scheduled/i.test(item.followUpStatus);
    return (
      <>
        <PageHeader eyebrow="Next review point" title="Follow-up reminder" description="Follow-up is shown as a safe next step, not as a diagnosis or treatment recommendation." />
        <PanelCard title={scheduled ? item.followUpStatus : "No follow-up is scheduled yet."} subtitle="Your clinic will contact you if a follow-up is needed.">
          <div className="patient-next-action"><span>{t("What you need to do")}</span><strong>{scheduled ? t("Keep this review point on your calendar.") : t("No follow-up action is needed from you right now.")}</strong></div>
          <button className="secondary-button" onClick={() => onAction("support", item.id)}>{t("Contact clinic")}</button>
        </PanelCard>
        <PanelCard title="Follow-up coordination" subtitle="How your review point is managed">
          <div className="status-list">
            <div><span>{t("Coordination mode")}</span><StatusChip label="Clinic managed" /></div>
            <div><span>{t("Scheduling")}</span><StatusChip label="Not enabled for this case" /></div>
            <div><span>{t("Clinical meaning")}</span><StatusChip label="Discuss with your care team" /></div>
          </div>
          <div className="safe-note"><strong>{t("What Kio does here")}</strong><p>{t("Kio shows review coordination only. It does not provide treatment recommendations or interpret clinical change.")}</p></div>
        </PanelCard>
      </>
    );
  }

  const intakeDone = item.intakeStatus === "Complete";
  const mriDone = item.mriStatus === "Received";
  const followupScheduled = /^scheduled/i.test(item.followUpStatus);
  const steps = buildSteps(
    [intakeDone, mriDone, reportReleased, reportReleased, followupScheduled],
    ["Information", "Imaging", "Specialist review", "Report", "Follow-up"],
  );
  const ctaAction = !intakeDone ? "complete-form" : !mriDone ? "patient-upload" : !/complete|consented/i.test(item.consentStatus) ? "consent" : reportReleased ? "ack-followup" : "support";
  const tiles: StatTile[] = [
    { icon: "forms", label: "Information", value: intakeDone ? "Complete" : "Action needed", tone: intakeDone ? "good" : "attention" },
    { icon: "scan", label: "MRI", value: mriDone ? "Received" : "Waiting", tone: mriDone ? "good" : "info" },
    { icon: "report", label: "Report", value: reportReleased ? "Available" : "In review", tone: reportReleased ? "good" : "info" },
    { icon: "calendar", label: "Follow-up", value: item.followUpStatus, tone: followupScheduled ? "good" : "info" },
  ];
  const latest = latestSafeEvent(item);
  const guidance = patientGuidance(item);

  return (
    <>
      <AppGreeting name={item.patientFirstName} kicker="Patient Portal" subtitle="A calm view of your care — what's done, what's next, and when you'll hear from us." />
      <StatusHero
        eyebrow="Your case status"
        status={item.safeStatus}
        latestUpdate={latest ? (latest.detail || latest.label) : undefined}
        steps={steps}
        ctaLabel={item.nextPatientAction}
        ctaHint="Your care team guides every step. You'll be notified when something needs you."
        onCta={() => onAction(ctaAction, item.id)}
      />
      <div className="patient-guidance">
        <div className="guidance-card guidance-do"><span>{t("What you need to do")}</span><strong>{t(guidance.doNow)}</strong></div>
        <div className="guidance-card guidance-next"><span>{t("What happens next")}</span><strong>{t(guidance.next)}</strong></div>
      </div>
      <p className="guidance-notify">{t(guidance.notify)}</p>
      <StatTiles tiles={tiles} />
      {reportReleased ? (
        <section className="patient-report-package">
          <div>
            <p className="eyebrow">{t("Your approved summary")}</p>
            <h2>{tv(item.releaseTitle ?? "Specialist-reviewed summary")}</h2>
            <p>{item.approvedSummary ? tv(item.approvedSummary) : t("Your specialist-reviewed summary is available.")}</p>
          </div>
          <EvidenceLayerTabs layers={[
            { label: "Care team review", status: "Completed", detail: "Reviewed before it was shared with you", tone: "good" },
            { label: "Specialist review details", status: "Reviewed first", detail: "Your care team reviewed the full results" },
            { label: "Follow-up", status: item.followUpStatus, detail: "Guided by your clinic", tone: "info" },
          ]} />
          <InteractiveReportPreview title="Your plain-language summary" description="This is the summary your care team approved for you, written in plain language.">
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
          <div className="safe-note"><strong>{t("Talk it through with your care team")}</strong><p>{t("This summary is here to help you understand your care. Your care team can answer any questions about what it means for you.")}</p></div>
        </section>
      ) : (
        <PanelCard title="Report status" subtitle="Your report will appear here after specialist approval.">
          <ReportReadinessChecklist title="Where your report is" items={[
            { label: "Specialist review", status: "In progress", detail: "Your care team is reviewing your imaging results." },
            { label: "Approved for you to view", status: "Waiting for approval", detail: "Your report is shared once it's approved for you." },
            { label: "Report available", status: "Not shared yet", detail: "It will appear here and you'll be notified." },
          ]} />
          <div className="safe-note"><strong>{t("Reviewed first, shared safely")}</strong><p>{t("Your care team is reviewing the results first. You'll see the approved summary when it is ready.")}</p></div>
        </PanelCard>
      )}
      <PanelCard title="Your case timeline" subtitle="Milestones your care team has shared">
        {latest ? <p className="timeline-updated">{t("Last updated")} {tv(latest.date)}</p> : null}
        <Timeline events={item.timeline} patientSafe />
      </PanelCard>
    </>
  );
}
