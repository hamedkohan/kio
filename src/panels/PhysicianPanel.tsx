import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { KioCase } from "../types";
import { CaseIdentity, CaseLifecycleStrip, EmptyState, EvidenceProvenanceStrip, EvidenceSection, InteractiveReportPreview, PageHeader, PanelCard, PercentileBar, ReportReadinessChecklist, ReportWorkspaceShell, StatusChip, SuppressedEvidenceNotice, Timeline, WorkflowReadinessPanel, WorkspaceHero } from "../components/ui";
import { CaseJourney } from "../components/CaseJourney";
import { ImagingEvidence } from "../components/ImagingEvidence";
import { LongitudinalProgram } from "../components/LongitudinalProgram";
import { CaseContextBar } from "../components/CaseContextBar";
import { getDemoCaseDetail, getDemoCaseSummaries } from "../data/kio-demo/repository";
import { DemoReportWorkspace } from "../components/DemoReportWorkspace";
import type { PhysicianBiomarkerEvidenceView, PhysicianCaseReviewView } from "../domain";
import type { Directory } from "../data/directory";

type Props = {
  caseViews: PhysicianCaseReviewView[];
  activeView: string;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onAction: (action: string, caseId: string, value?: string) => void;
  directory: Directory;
};

export const physicianNav = [
  { id: "cases", label: "Patient Cases" },
  { id: "snapshot", label: "Clinical Snapshot" },
  { id: "imaging", label: "Imaging Summary" },
  { id: "intake", label: "Cognitive Intake" },
  { id: "timeline", label: "Timeline" },
  { id: "longitudinal", label: "Follow-up & Longitudinal" },
  { id: "notes", label: "Decision Notes" },
  { id: "reports", label: "Final Reports" },
];

export function PhysicianPanel({ caseViews, activeView, selectedCaseId, onSelectCase, onAction, directory }: Props) {
  const { t, tv } = useI18n();
  const cases = caseViews.map((view) => view.caseRecord);
  const neurologists = useMemo(() => directory.clinicians.filter((clinician) => clinician.role === "neurologist" && clinician.active), [directory]);
  const [actingAs, setActingAs] = useState(() => neurologists[0]?.name ?? "");
  const [myCasesOnly, setMyCasesOnly] = useState(false);
  // "My cases" = cases assigned to the clinician you are acting as.
  const forActing = (items: KioCase[]) => (myCasesOnly && actingAs ? items.filter((item) => item.assignedNeurologist === actingAs) : items);
  const assignedToMe = cases.filter((item) => item.assignedNeurologist === actingAs);

  const readyForReview = cases.filter((item) => /reviewed/i.test(item.radiologistStatus) && /review pending|not ready/i.test(item.neurologistStatus) && !item.physicianNote);
  const finalizationPending = cases.filter((item) => /reviewed/i.test(item.radiologistStatus) && !/physician reviewed/i.test(item.neurologistStatus) && !!item.physicianNote);
  const releasePending = cases.filter((item) => /physician reviewed/i.test(item.neurologistStatus) && !/released/i.test(item.reportStatus));
  const actionable = [...readyForReview, ...finalizationPending, ...releasePending].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
  const completed = cases.filter((item) => /reviewed/i.test(item.radiologistStatus) && !actionable.some((actionItem) => actionItem.id === item.id));
  const selected = actionable.find((item) => item.id === selectedCaseId) ?? completed.find((item) => item.id === selectedCaseId) ?? readyForReview[0] ?? releasePending[0] ?? completed[0] ?? cases[0];
  const selectedView = caseViews.find((view) => view.caseRecord.id === selected.id) ?? caseViews[0];
  const selectedEvidence = selectedView.biomarkerEvidenceView;
  const selectedNeedsAction = actionable.some((item) => item.id === selected.id);
  const selectedReleasePending = /release approval pending|patient summary approved|ready for release|pdf pending/i.test(`${selected.reportStatus} ${selected.releaseStatus}`);
  const [note, setNote] = useState(selected.physicianNote);
  const demoSummaries = useMemo(() => getDemoCaseSummaries(), []);
  const [demoCaseId, setDemoCaseId] = useState(demoSummaries[0]?.caseRecord.case_id ?? "");
  const demoDetail = getDemoCaseDetail(demoCaseId) ?? (demoSummaries[0] ? getDemoCaseDetail(demoSummaries[0].caseRecord.case_id) : undefined);

  useEffect(() => {
    setNote(selected.physicianNote);
  }, [selected.id, selected.physicianNote]);

  if (activeView === "cases") return (
    <>
      <WorkspaceHero
        eyebrow="Physician Synthesis Workspace"
        title="Turn reviewed evidence into patient-safe clinical meaning"
        description="Review radiologist handoff, structured visual summary, quantitative evidence, intake context, synthesis readiness, and patient-safe release status."
        stats={[
          { label: "Ready for review", value: forActing(readyForReview).length, detail: "Radiologist handoff complete", tone: forActing(readyForReview).length ? "attention" : "good" },
          { label: "Draft synthesis", value: forActing(finalizationPending).length, detail: "Interpretation in progress", tone: "info" },
          { label: "Release pending", value: forActing(releasePending).length, detail: "Patient-safe approval path", tone: forActing(releasePending).length ? "attention" : "good" },
          { label: "Completed", value: forActing(completed).length, detail: "Read-only clinical output", tone: "good" },
        ]}
      />
      <div className="acting-bar">
        <label className="acting-as">
          <span>{t("Acting as")}</span>
          {neurologists.length ? (
            <select value={actingAs} onChange={(event) => setActingAs(event.target.value)}>
              {neurologists.map((clinician) => <option key={clinician.id} value={clinician.name}>{clinician.name}</option>)}
            </select>
          ) : <strong>{t("No clinician in directory")}</strong>}
        </label>
        <div className="acting-toggle" role="group" aria-label={t("Case scope")}>
          <button type="button" className={!myCasesOnly ? "active" : ""} aria-pressed={!myCasesOnly} onClick={() => setMyCasesOnly(false)}>{t("All cases")} <em>{cases.length}</em></button>
          <button type="button" className={myCasesOnly ? "active" : ""} aria-pressed={myCasesOnly} onClick={() => setMyCasesOnly(true)}>{t("My cases")} <em>{assignedToMe.length}</em></button>
        </div>
      </div>
      {myCasesOnly ? (
        <WorklistGroup title="Assigned to you" subtitle="Every case assigned to you, at any stage — visible from the moment Operations assigns it" items={assignedToMe} selectedId={selected.id} onSelectCase={onSelectCase} empty="No cases are assigned to you yet." />
      ) : null}
      <PanelCard title="Case journey" subtitle="Where the selected case sits in the end-to-end flow"><CaseJourney caseRecord={selected} compact /></PanelCard>
      <WorklistGroup title="Ready for Physician Review" subtitle="Radiologist-reviewed cases awaiting clinical interpretation" items={forActing(readyForReview)} selectedId={selected.id} onSelectCase={onSelectCase} empty="No ready cases." />
      <WorklistGroup title="Report Finalization Pending" subtitle="Interpretation drafted or in progress, not finalized" items={forActing(finalizationPending)} selectedId={selected.id} onSelectCase={onSelectCase} empty="No draft interpretations waiting for finalization." />
      <WorklistGroup title="Release Approval Pending" subtitle="Finalized output awaiting patient-safe summary or PDF approval" items={forActing(releasePending)} selectedId={selected.id} onSelectCase={onSelectCase} empty="No release approvals pending." />
      <WorklistGroup title="Completed / Released" subtitle="Read-only clinical reviews and released outputs" items={forActing(completed)} selectedId={selected.id} onSelectCase={onSelectCase} empty="No completed cases." readOnly />
      <DemoReportWorkspace role="physician" title="Imported report evidence as physician synthesis workspaces" />
    </>
  );

  if (activeView === "imaging") return (
    <>
      <PageHeader eyebrow={`${selected.id} · Radiologist-reviewed output`} title="Imaging Summary" description="Reviewed imaging evidence presented for clinical interpretation, without segmentation-editing tools." action={<StatusChip label={selected.radiologistStatus} />} />
      {demoDetail ? <CaseContextBar summaries={demoSummaries} detail={demoDetail} selectedCaseId={demoCaseId} onSelectCase={setDemoCaseId} /> : null}
      <PanelCard title="Radiologist review summary" subtitle={selectedView.radiologistHandoffSummary || selected.radiologistComment || "No limitation note added."}>
        <div className="finding-summary">{selectedEvidence.metricRows.length ? selectedEvidence.metricRows.slice(0, 4).map((metric) => <div key={metric.id}><span className="finding-mark" /><strong>{tv(metric.label)}</strong><p>{t("Use as reviewed imaging evidence in the full clinical context.")}</p></div>) : selected.keyFindings.map((finding) => <div key={finding}><span className="finding-mark" /><strong>{tv(finding)}</strong><p>{t("Use as reviewed imaging evidence in the full clinical context.")}</p></div>)}</div>
      </PanelCard>
      <StructuredVisualSummaryCard view={selectedView} />
      <PhysicianEvidenceTable evidence={selectedEvidence} />
      <ImagingEvidence caseId={demoCaseId} />
    </>
  );

  if (activeView === "intake") return (
    <>
      <PageHeader eyebrow={`${selected.id} · clinical context`} title="Cognitive Intake" description="Patient and caregiver-submitted context for physician interpretation; it does not generate diagnosis." />
      <div className="card-grid two"><ContextCard label="Memory complaint" value={selected.memoryComplaint} source="Patient intake" /><ContextCard label="Cognitive history" value={selected.cognitiveHistory} source="Patient intake" /><ContextCard label="Cognitive test" value={selected.cognitiveScore} source="Clinic record" /><ContextCard label="Caregiver observation" value={selected.caregiverObservation} source="Caregiver intake" /></div>
      <PanelCard title="Context readiness"><div className="status-list"><div><span>{t("Structured intake")}</span><StatusChip label={selected.intakeStatus} /></div><div><span>{t("Prior MRI")}</span><StatusChip label={selected.longitudinal ? "Available" : "Not available"} /></div><div><span>{t("Clinical sufficiency")}</span><StatusChip label="Physician decision required" /></div></div></PanelCard>
    </>
  );

  if (activeView === "timeline") return (
    <>
      <PageHeader eyebrow={`${selected.id} · longitudinal context`} title="Timeline" description="Clinical and review events, with prior comparison context when available." />
      <div className="split-layout"><PanelCard title="Case timeline"><Timeline events={selected.timeline} /></PanelCard><PanelCard title="Prior MRI comparison">{selected.longitudinal ? <div className="trend-placeholder"><strong>{t("Two-time comparison available")}</strong><div className="trend-line"><span /><span /><span /><span /></div><p>{t("Reviewed comparison indicates stable imaging-derived measures. Clinical meaning remains physician-owned.")}</p></div> : <EmptyState title="No prior MRI available" message="Continue single-timepoint clinical review or request prior imaging if needed." />}</PanelCard></div>
    </>
  );

  if (activeView === "longitudinal") return (
    <>
      <PageHeader eyebrow={`${selected.id} · long-term care`} title="Follow-up & Longitudinal" description="Longitudinal imaging monitoring and a brain-health program for long-term engagement, prevention, and follow-up." />
      {demoDetail ? <CaseContextBar summaries={demoSummaries} detail={demoDetail} selectedCaseId={demoCaseId} onSelectCase={setDemoCaseId} /> : null}
      <LongitudinalProgram caseId={demoCaseId} />
    </>
  );

  if (activeView === "notes") return (
    <>
      <PageHeader eyebrow={`${selected.id} · physician-owned interpretation`} title="Decision Notes" description="Record clinical interpretation and prepare patient-safe communication. Kio does not generate treatment recommendations." />
      <div className="split-layout">
        <PanelCard title="Physician interpretation"><textarea className="note-area tall" value={note} readOnly={!selectedNeedsAction} onChange={(event) => setNote(event.target.value)} placeholder={t("Add interpretation in clinical context...")} /><div className="button-row"><button className="secondary-button" disabled={!selectedNeedsAction} onClick={() => onAction("save-note", selected.id, note)}>{t("Save draft")}</button><button className="primary-button" disabled={!selectedNeedsAction || /released/i.test(selected.reportStatus)} onClick={() => onAction("finalize", selected.id, note)}>{t("Finalize clinical review")}</button></div>{selectedView.synthesis ? <div className="safe-note"><strong>{t("Synthesis draft")}</strong><p>{tv(selectedView.synthesis.clinicalInterpretationDraft || selectedView.synthesis.imagingEvidenceSummary)}</p></div> : null}{!selectedNeedsAction ? <div className="prototype-note"><strong>{t("Read-only case")}</strong><p>{t("This case is finalized or released. It stays available for review, not active interpretation.")}</p></div> : null}</PanelCard>
        <PanelCard title="Release readiness"><WorkflowReadinessPanel items={[
          { label: "Evidence ready", status: selectedView.readiness.evidenceReady ? "Ready" : "Limited" },
          { label: "Synthesis", status: selectedView.synthesis?.status ?? "not_started" },
          { label: "Patient-safe draft", status: selectedView.patientSafeSummaryPreview?.status ?? selected.patientSummaryStatus },
          { label: "Publication review", status: selectedView.readiness.patientSafeDraftReadyForPublicationReview ? "Ready for review" : "Not ready" },
          { label: "Patient visibility", status: "Not visible" },
        ]} /><div className="ai-boundary"><strong>{t("Release is separate from finalization")}</strong><p>{t("Technical AI outputs and internal notes cannot be released to Patient / Caregiver.")}</p></div></PanelCard>
      </div>
    </>
  );

  if (activeView === "reports") return (
    <>
      <PageHeader eyebrow="Approved outputs" title="Final Reports" description="Finalized clinical output and patient-safe release status remain separate." />
      <PanelCard title={`${selected.id} report`} action={<StatusChip label={selected.reportStatus} />}>
        <ReportObject item={selected} view={selectedView} />
        <div className="button-row wrap">
          <button className="secondary-button" disabled={!selectedNeedsAction || /physician reviewed|released/i.test(`${selected.neurologistStatus} ${selected.reportStatus}`)} onClick={() => onAction("finalize", selected.id, note)}>{t("Finalize review")}</button>
          <button className="secondary-button" disabled={!/physician reviewed/i.test(selected.neurologistStatus) || /approved/i.test(selected.patientSummaryStatus)} onClick={() => onAction("approve-summary", selected.id)}>{t("Approve patient-safe summary")}</button>
          <button className="secondary-button" disabled={!/approved/i.test(selected.patientSummaryStatus) || /approved|released/i.test(selected.pdfReleaseStatus)} onClick={() => onAction("approve-pdf", selected.id)}>{t("Approve PDF release")}</button>
          <button className="primary-button" disabled={!/approved/i.test(selected.patientSummaryStatus) || !/approved/i.test(selected.pdfReleaseStatus) || /released/i.test(selected.reportStatus)} onClick={() => onAction("release", selected.id)}>{t("Release approved output")}</button>
        </div>
        {selectedReleasePending ? <div className="prototype-note"><strong>{t("Release decision pending")}</strong><p>{t("Final report exists, but Patient / Caregiver still sees only safe pending-release status until approval and release.")}</p></div> : null}
        <div className="safe-note"><strong>{t("Release logic boundary")}</strong><p>{t("Finalized clinical review, patient-safe summary approval, PDF approval, and patient-visible release are separate prototype states.")}</p></div>
      </PanelCard>
    </>
  );

  return (
    <>
      <PageHeader eyebrow={`${selected.id} · clinical review`} title="Clinical Snapshot" description="Interpret reviewed imaging findings in patient context and identify the next physician-owned action." action={<StatusChip label={selected.neurologistStatus} />} />
      <div className="clinical-hero">
        <div><CaseIdentity item={selected} /><p>{selected.memoryComplaint}</p></div>
        <div className="clinical-score"><span>{t("Cognitive test")}</span><strong>{selected.cognitiveScore}</strong><small>{t("Context only")}</small></div>
        <div className="clinical-score"><span>{t("Radiologist review")}</span><strong>{tv(selected.radiologistStatus)}</strong><small>{t("{quality} quality", { quality: tv(selected.imageQuality) })}</small></div>
      </div>
      <PanelCard title="Workflow visibility" subtitle="Canonical Kio flow with physician-safe labels"><CaseLifecycleStrip item={selected} /></PanelCard>
      <PhysicianReportWorkspace item={selected} view={selectedView} evidence={selectedEvidence} />
      <DemoReportWorkspace role="physician" title="Legacy PDF outputs transformed into synthesis-ready evidence" />
      <div className="sticky-actions"><span><strong>{t("Next action")}</strong> {selectedNeedsAction ? t("Add interpretation, finalize review, or approve patient-safe release.") : t("Read-only completed review. Use follow-up or report history if needed.")}</span><div className="button-row"><button className="secondary-button" disabled={!selectedNeedsAction} onClick={() => onAction("clarification", selected.id)}>{t("Request Radiologist clarification")}</button><button className="primary-button" disabled={!selectedNeedsAction || /physician reviewed|released/i.test(`${selected.neurologistStatus} ${selected.reportStatus}`)} onClick={() => onAction("finalize", selected.id, note)}>{t("Finalize clinical review")}</button></div></div>
    </>
  );
}

function PhysicianReportWorkspace({ item, view, evidence }: { item: KioCase; view: PhysicianCaseReviewView; evidence: PhysicianBiomarkerEvidenceView }) {
  const { t, tv } = useI18n();
  const patientSafePreview = view.patientSafeSummaryPreview;
  const topMetrics = evidence.metricRows.slice(0, 4);
  return (
    <ReportWorkspaceShell
      eyebrow="Interactive synthesis workspace"
      title="From reviewed imaging report to patient-safe meaning"
      description="Physician Review combines radiologist handoff, reviewed quantitative evidence, structured visual assessment, clinical context, and patient-safe translation."
      layers={[
        { label: "Reviewed Imaging Evidence", status: view.readiness.evidenceReady ? "Ready" : "Limited", detail: `${evidence.reviewedOutputCount} reviewed output(s)`, tone: view.readiness.evidenceReady ? "good" : "attention" },
        { label: "Clinical Synthesis", status: view.synthesis?.status ?? "not_started", detail: view.synthesis?.suitableForFinalApproval ? "Ready for approval placeholder" : "Physician-owned draft", tone: view.synthesis ? "info" : "attention" },
        { label: "Patient-Safe Translation", status: patientSafePreview?.status ?? "not_started", detail: patientSafePreview?.readyForPublicationReview ? "Ready for publication review" : "Not patient-visible", tone: patientSafePreview?.readyForPublicationReview ? "good" : "attention" },
        { label: "Publication Readiness", status: view.header.releaseStatus, detail: "Release remains separate", tone: /released/i.test(view.header.releaseStatus) ? "good" : "info" },
      ]}
      sidebar={
        <>
          <ReportReadinessChecklist
            title="Synthesis readiness checklist"
            items={[
              { label: "Radiologist handoff", status: view.structuredVisualSummary.suitableForPhysicianReview ? "Ready" : "Not ready" },
              { label: "Reviewed quantitative evidence", status: evidence.metricRows.length ? "Available" : "Waiting" },
              { label: "Structured visual summary", status: view.structuredVisualSummary.status },
              { label: "Patient-safe draft", status: patientSafePreview?.status ?? item.patientSummaryStatus },
              { label: "Unsafe content exclusions", status: view.patientSafeExcludedContent.length ? `${view.patientSafeExcludedContent.length}` : "None" },
            ]}
          />
          <SuppressedEvidenceNotice
            message="Unreviewed raw AI output, segmentation maps, raw visual scores, and internal notes are excluded from patient-safe translation."
          />
          <EvidenceProvenanceStrip items={[
            { label: "Structured reports", value: view.structuredReportRefs.length ? `${view.structuredReportRefs.length}` : "0", detail: "Referenced, not copied" },
            { label: "Evidence review", value: view.evidenceReview?.evidenceAdequacyStatus ?? "not_reviewed", detail: "Physician-facing readiness" },
            { label: "Patient visibility", value: patientSafePreview?.patientVisible ? "Visible" : "Not visible", detail: "Requires future release gate" },
          ]} />
        </>
      }
    >
      <InteractiveReportPreview title="Physician-facing evidence package" description="Reviewed imaging evidence is assembled into a synthesis workspace rather than rendered as a static report page.">
        <div className="report-workspace-mini-grid">
          <div className="report-layer-card"><h3>{t("Radiologist handoff")}</h3><p>{view.radiologistHandoffSummary ? tv(view.radiologistHandoffSummary) : t("Radiologist handoff is not complete.")}</p></div>
          <div className="report-layer-card"><h3>{t("Structured visual summary")}</h3><p>{view.structuredVisualSummary.imagingSummary ? tv(view.structuredVisualSummary.imagingSummary) : `${tv(view.structuredVisualSummary.atrophySummary ?? "Not available")}. ${tv(view.structuredVisualSummary.vascularSummary ?? "Not available")}`}</p></div>
          <div className="report-layer-card"><h3>{t("Quantitative evidence")}</h3><p>{topMetrics.length ? topMetrics.map((metric) => `${tv(metric.label)}: ${tv(metric.comparisonLabel)}`).join(". ") : t(evidence.emptyReason ?? "No reviewed quantitative output available yet.")}</p></div>
          <div className="report-layer-card"><h3>{t("Clinical context")}</h3><p>{tv(item.memoryComplaint)}</p></div>
        </div>
      </InteractiveReportPreview>
      <div className="split-layout">
        <EvidenceSection eyebrow="Clinical synthesis" title="Physician-owned interpretation draft" description="The system structures evidence; it does not generate diagnosis.">
          <div className="context-list">
            <div><span>{t("Clinical context summary")}</span><p>{view.synthesis?.clinicalContextSummary ? tv(view.synthesis.clinicalContextSummary) : tv(item.memoryComplaint)}</p></div>
            <div><span>{t("Imaging evidence summary")}</span><p>{view.synthesis?.imagingEvidenceSummary ? tv(view.synthesis.imagingEvidenceSummary) : t("Awaiting physician synthesis.")}</p></div>
            <div><span>{t("Quantitative evidence summary")}</span><p>{view.synthesis?.quantitativeEvidenceSummary ? tv(view.synthesis.quantitativeEvidenceSummary) : t("Reviewed quantitative evidence is available only after radiology review.")}</p></div>
          </div>
          {view.openQuestions.length ? <div className="prototype-note"><strong>{t("Open questions")}</strong><p>{view.openQuestions.map((question) => tv(question)).join(". ")}</p></div> : null}
        </EvidenceSection>
        <EvidenceSection eyebrow="Patient-safe translation" title="Release preview without unsafe evidence" description="Only physician-approved plain language may become patient-visible in a later release step.">
          {patientSafePreview ? (
            <div className="patient-report-package">
              <h2>{t("Patient-safe summary draft")}</h2>
              <p>{tv(patientSafePreview.plainLanguageSummary ?? "Draft exists but is not patient-visible.")}</p>
              <div className="context-list">
                <div><span>{t("What was reviewed")}</span><p>{tv(patientSafePreview.whatWasReviewed ?? "Reviewed imaging evidence and clinical context.")}</p></div>
                <div><span>{t("Recommended next steps")}</span><p>{patientSafePreview.recommendedNextSteps?.length ? patientSafePreview.recommendedNextSteps.map((step) => tv(step)).join(". ") : t("No patient-facing next step has been approved yet.")}</p></div>
              </div>
            </div>
          ) : <EmptyState title="Patient-safe summary not drafted" message="The patient portal remains empty until approved plain-language content is prepared and released." />}
          {view.patientSafeExcludedContent.length ? <div className="prototype-note"><strong>{t("Excluded from patient wording")}</strong><p>{view.patientSafeExcludedContent.map((excluded) => tv(excluded.excludedContentType)).join(", ")}</p></div> : null}
        </EvidenceSection>
      </div>
    </ReportWorkspaceShell>
  );
}

function ContextCard({ label, value, source }: { label: string; value: string; source: string }) {
  const { tv } = useI18n();
  return <PanelCard title={label} subtitle={source}><p className="context-copy">{tv(value)}</p></PanelCard>;
}

function StructuredVisualSummaryCard({ view }: { view: PhysicianCaseReviewView }) {
  const { t, tv } = useI18n();
  const summary = view.structuredVisualSummary;
  return (
    <PanelCard title="Structured visual MRI summary" subtitle="Radiologist-reviewed imaging evidence, not final diagnosis">
      <div className="status-list">
        <div><span>{t("Visual assessment")}</span><StatusChip label={summary.status} /></div>
        <div><span>{t("Handoff")}</span><StatusChip label={summary.suitableForPhysicianReview ? "Ready" : "Not ready"} /></div>
        <div><span>{t("Visual score count")}</span><StatusChip label={`${summary.visualScoreCount}`} /></div>
      </div>
      <div className="context-list">
        <div><span>{t("Atrophy summary")}</span><p>{tv(summary.atrophySummary ?? "Not available")}</p></div>
        <div><span>{t("Vascular summary")}</span><p>{tv(summary.vascularSummary ?? "Not available")}</p></div>
      </div>
      <div className="ai-boundary"><strong>{t("Boundary")}</strong><p>{t("Visual scores are imaging evidence and remain separate from final clinical interpretation.")}</p></div>
    </PanelCard>
  );
}

function PhysicianEvidenceTable({ evidence }: { evidence: PhysicianBiomarkerEvidenceView }) {
  const { t, tv } = useI18n();
  if (!evidence.metricRows.length) return (
    <PanelCard title="Selected quantitative context" subtitle="Reviewed values remain decision-support evidence">
      <EmptyState title="No reviewed quantitative output available yet" message={evidence.emptyReason ?? "AI output is pending review."} />
    </PanelCard>
  );
  return (
    <PanelCard title="Selected quantitative context" subtitle="Radiologist-reviewed values only; unreviewed technical AI output is hidden">
      <div className="table-wrap"><table><thead><tr><th>{t("Region")}</th><th>{t("Reviewed value")}</th><th>{t("Percentile context")}</th><th>{t("Reviewed comparison")}</th><th>{t("Validity")}</th></tr></thead><tbody>{evidence.metricRows.map((metric) => <tr key={metric.id}><td>{tv(metric.region)}<small>{tv(metric.label)}</small></td><td className="bidi-isolate">{metric.valueLabel}</td><td>{typeof metric.percentile === "number" ? <PercentileBar value={metric.percentile} /> : "—"}</td><td>{tv(metric.comparisonLabel)}</td><td><StatusChip label={metric.validityStatus} /></td></tr>)}</tbody></table></div>
      {evidence.adRelevantSummary.length ? <div className="ai-boundary"><strong>{t("AD-relevant reviewed metric")}</strong><p>{evidence.adRelevantSummary.map((metric) => `${tv(metric.label)}: ${tv(metric.comparisonLabel)}`).join(". ")}</p></div> : null}
      {evidence.longitudinalSummary.length ? <div className="ai-boundary"><strong>{t("Reviewed longitudinal comparison")}</strong><p>{evidence.longitudinalSummary.map((metric) => `${tv(metric.label)}: ${tv(metric.comparisonLabel)}`).join(". ")}</p></div> : null}
      {evidence.limitations.length ? <div className="prototype-note"><strong>{t("Limitations")}</strong><p>{evidence.limitations.map((limitation) => tv(limitation)).join(". ")}</p></div> : null}
    </PanelCard>
  );
}

function PhysicianCaseCard({ item, active, onSelectCase, readOnly = false }: { item: KioCase; active: boolean; onSelectCase: (id: string) => void; readOnly?: boolean }) {
  const { t, tv } = useI18n();
  const next = /release approval pending|patient summary approved|pdf pending|ready for release/i.test(`${item.reportStatus} ${item.releaseStatus}`) ? "Approve patient-safe summary / PDF release" : readOnly ? "Review finalized output" : "Interpret and finalize review";
  return (
    <button type="button" className={`case-card clinical ${active ? "active" : ""}`} onClick={() => onSelectCase(item.id)}>
      <div className="case-card-top"><CaseIdentity item={item} /><StatusChip label={readOnly ? "Read-only" : item.neurologistStatus} /></div>
      <div className="case-card-meta"><span>{t("Clinical context")} <strong>{tv(item.intakeStatus)}</strong></span><span>{t("Radiologist")} <strong>{tv(item.radiologistStatus)}</strong></span></div>
      <div className="case-card-action"><span>{t("Next clinical action")}</span><strong>{t(next)}</strong></div>
    </button>
  );
}

function WorklistGroup({ title, subtitle, items, selectedId, onSelectCase, empty, readOnly = false }: { title: string; subtitle: string; items: KioCase[]; selectedId: string; onSelectCase: (id: string) => void; empty: string; readOnly?: boolean }) {
  const { t } = useI18n();
  return (
    <PanelCard title={title} subtitle={subtitle}>
      {items.length ? <div className="card-grid two">{items.map((item) => <PhysicianCaseCard key={item.id} item={item} active={item.id === selectedId} onSelectCase={onSelectCase} readOnly={readOnly} />)}</div> : <p className="muted">{t(empty)}</p>}
    </PanelCard>
  );
}

function ReportObject({ item, view }: { item: KioCase; view: PhysicianCaseReviewView }) {
  const { t, tv } = useI18n();
  return (
    <div className="report-preview">
      <div className="report-banner physician"><strong>{t("Structured report object")}</strong><span className="bidi-isolate">{item.reportVersion}</span></div>
      <div className="report-object-grid">
        <div><span>{t("AI draft")}</span><strong className="bidi-isolate">{item.outputVersion}</strong></div>
        <div><span>{t("Radiologist section")}</span><strong>{tv(item.radiologistStatus)}</strong></div>
        <div><span>{t("Physician interpretation")}</span><strong>{tv(item.neurologistStatus)}</strong></div>
        <div><span>{t("Patient summary")}</span><strong>{tv(item.patientSummaryStatus)}</strong></div>
        <div><span>{t("PDF release")}</span><strong>{tv(item.pdfReleaseStatus)}</strong></div>
        <div><span>{t("Patient visibility")}</span><strong>{tv(item.releaseStatus)}</strong></div>
      </div>
      <h3>{t("Clinical context summary")}</h3><p>{tv(item.memoryComplaint)}</p>
      <h3>{t("Reviewed imaging summary")}</h3><p>{item.keyFindings.length ? item.keyFindings.map((finding) => tv(finding)).join(". ") : t("No reviewed imaging summary available.")}</p>
      <h3>{t("Physician interpretation")}</h3><p>{item.physicianNote ? tv(item.physicianNote) : t("Clinical interpretation has not been finalized.")}</p>
      <h3>{t("Patient-safe summary draft")}</h3><p>{item.patientApprovedSummary ? tv(item.patientApprovedSummary) : t("Pending physician-approved patient-safe wording. Technical AI outputs and internal notes remain hidden.")}</p>
      {view.patientSafeSummaryPreview ? <div className="safe-note"><strong>{t("Patient-safe draft preview")}</strong><p>{tv(view.patientSafeSummaryPreview.plainLanguageSummary ?? "Draft exists but is not patient-visible.")}</p></div> : null}
      {view.patientSafeExcludedContent.length ? <div className="prototype-note"><strong>{t("Excluded unsafe content")}</strong><p>{view.patientSafeExcludedContent.map((item) => tv(item.excludedContentType)).join(", ")}</p></div> : null}
      <WorkflowReadinessPanel items={[
        { label: "Evidence ready", status: view.readiness.evidenceReady ? "Ready" : "Limited" },
        { label: "Final approval placeholder", status: view.readiness.synthesisReadyForFinalApproval ? "Ready" : "Not ready" },
        { label: "Publication review", status: view.readiness.patientSafeDraftReadyForPublicationReview ? "Ready" : "Not ready" },
        { label: "Unsafe content exclusions", status: view.patientSafeExcludedContent.length ? `${view.patientSafeExcludedContent.length}` : "None" },
      ]} />
      <h3>{t("Structured report references")}</h3><p>{view.structuredReportRefs.length ? view.structuredReportRefs.map((report) => `${report.id} · ${report.status}`).join(". ") : t("No structured report reference available.")}</p>
      <h3>{t("Release status ladder")}</h3>
      <div className="release-ladder">
        <div><span>1</span><strong>{t("Physician review finalized")}</strong><StatusChip label={/physician reviewed/i.test(item.neurologistStatus) ? "Complete" : "Pending"} /></div>
        <div><span>2</span><strong>{t("Patient-safe summary approved")}</strong><StatusChip label={item.patientSummaryStatus} /></div>
        <div><span>3</span><strong>{t("PDF release approved")}</strong><StatusChip label={item.pdfReleaseStatus} /></div>
        <div><span>4</span><strong>{t("Patient-visible release completed")}</strong><StatusChip label={item.releaseStatus} /></div>
      </div>
      <h3>{t("PDF and release controls")}</h3><p>{t("Patient-safe summary approval and PDF release approval are separate states before patient visibility.")}</p>
      <h3>{t("Version / amendment history")}</h3><p><span className="bidi-isolate">{item.reportVersion}</span>. {t("Amendment status")}: {tv(item.amendmentStatus)}.</p>
    </div>
  );
}
