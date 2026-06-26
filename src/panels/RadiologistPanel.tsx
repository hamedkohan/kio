import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import type { KioCase } from "../types";
import { CaseIdentity, CaseLifecycleStrip, CaseWorkflowSummary, EmptyState, EvidenceProvenanceStrip, EvidenceSection, ImagingPlaceholder, InteractiveReportPreview, PageHeader, PanelCard, PercentileBar, ReportReadinessChecklist, ReportWorkspaceShell, StatusChip, SuppressedEvidenceNotice, WorkflowReadinessPanel, WorkspaceHero } from "../components/ui";
import { DemoReportWorkspace } from "../components/DemoReportWorkspace";
import { getDemoCaseDetail, getDemoCaseSummaries } from "../data/kio-demo/repository";
import type { DemoCaseDetail, DemoCaseSummary } from "../data/kio-demo/types";
import type { RadiologistBiomarkerReviewView, RadiologistCaseReviewView } from "../domain";

type Props = {
  caseViews: RadiologistCaseReviewView[];
  activeView: string;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onAction: (action: string, caseId: string, value?: string) => void;
};

export const radiologistNav = [
  { id: "queue", label: "Review Queue" },
  { id: "aiqa", label: "AI QA Workbench" },
  { id: "room", label: "Case Review Room" },
  { id: "images", label: "Image / Annotation" },
  { id: "findings", label: "Quantitative Findings" },
  { id: "draft", label: "Report Draft" },
  { id: "comments", label: "Comments" },
  { id: "completed", label: "Completed Reviews" },
];

export function RadiologistPanel({ caseViews, activeView, selectedCaseId: legacySelectedCaseId, onSelectCase, onAction }: Props) {
  const { t, tv, formatNumber } = useI18n();
  const demoCaseSummaries = useMemo(() => getDemoCaseSummaries(), []);
  const [selectedCaseId, setSelectedCaseId] = useState(demoCaseSummaries[0]?.caseRecord.case_id ?? "");
  const selectedDemoCase = getDemoCaseDetail(selectedCaseId) ?? (demoCaseSummaries[0] ? getDemoCaseDetail(demoCaseSummaries[0].caseRecord.case_id) : undefined);
  const cases = caseViews.map((view) => view.caseRecord);
  const queue = cases.filter((item) => (item.mriStatus === "Received" || /quality review/i.test(item.radiologistStatus)) && /review pending|needs quality review/i.test(item.radiologistStatus));
  const completed = cases.filter((item) => /radiologist reviewed/i.test(item.radiologistStatus));
  const [queueSearch, setQueueSearch] = useState("");
  const queueSearchText = queueSearch.trim().toLowerCase();
  const filteredQueue = queue.filter((item) => {
    if (!queueSearchText) return true;
    return [
      item.id,
      item.patientName,
      tv(item.patientName),
      item.radiologistStatus,
      tv(item.radiologistStatus),
      item.aiStatus,
      tv(item.aiStatus),
      item.nextAction,
      tv(item.nextAction),
    ].join(" ").toLowerCase().includes(queueSearchText);
  });
  const waitingList = cases.filter((item) => !queue.some((queued) => queued.id === item.id) && !completed.some((done) => done.id === item.id));
  const completedSelected = activeView === "completed" ? completed.find((item) => item.id === legacySelectedCaseId) : undefined;
  const selected = activeView === "completed" ? completedSelected ?? completed[0] ?? cases[0] : filteredQueue.find((item) => item.id === legacySelectedCaseId) ?? filteredQueue[0] ?? queue.find((item) => item.id === legacySelectedCaseId) ?? queue[0] ?? cases[0];
  const selectedView = caseViews.find((view) => view.caseRecord.id === selected.id) ?? caseViews[0];
  const selectedBiomarkers = selectedView.biomarkerView;
  const isActionable = queue.some((item) => item.id === selected.id);
  const [roomTab, setRoomTab] = useState("snapshot");
  const [comment, setComment] = useState(selected.radiologistComment);

  useEffect(() => {
    setComment(selected.radiologistComment);
  }, [selected.id, selected.radiologistComment]);

  if (activeView === "aiqa") return (
    <>
      <PageHeader eyebrow="MRI Scientist / AI QA" title="AI QA Workbench" description="Inspect structured quantitative outputs, QC status, outliers, and source-page references before clinical handoff." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <DemoReportWorkspace role="aiqa" title="Technical usability review from imported Kio reports" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector />
    </>
  );

  const queueCards = (
    <div className="card-grid two">
      {filteredQueue.map((item) => (
        <button type="button" className={`case-card ${item.id === selected.id ? "active" : ""}`} key={item.id} onClick={() => onSelectCase(item.id)}>
          <div className="case-card-top"><CaseIdentity item={item} /><StatusChip label={item.radiologistStatus} /></div>
          <div className="case-card-meta"><span>{t("Quality")} <strong>{tv(item.imageQuality)}</strong></span><span>{t("AI output")} <strong>{tv(item.aiStatus)}</strong></span></div>
          <div className="case-card-action"><span>{t("Next action")}</span><strong>{tv(item.nextAction)}</strong></div>
        </button>
      ))}
    </div>
  );

  if (activeView === "queue") return (
    <>
      <WorkspaceHero
        eyebrow="Radiologist Review Workspace"
        title="Validate imaging evidence before clinical synthesis"
        description="Review protocol readiness, image quality, segmentation QC, quantitative evidence, and structured visual assessment for governed physician handoff."
        stats={[
          { label: "Active reviews", value: queue.length, detail: "Awaiting imaging decision", tone: queue.length ? "attention" : "good" },
          { label: "Completed reviews", value: completed.length, detail: "Handed off for interpretation", tone: "good" },
          { label: "Selected output", value: selectedBiomarkers.aiProcessingStatus, detail: selectedBiomarkers.algorithmVersion ?? selected.outputVersion, tone: "info" },
        ]}
      />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <DemoReportWorkspace role="radiologist" title="Legacy report modules as interactive radiology workspaces" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector />
    </>
  );

  if (activeView === "completed") return (
    <>
      <PageHeader eyebrow="Completed imaging reviews" title="Completed Reviews" description="Read-only reviewed imaging outputs already handed off for clinical interpretation." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <DemoReportWorkspace role="radiologist" title="Completed imported report review context" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector />
    </>
  );

  if (activeView === "images") return (
    <>
      <PageHeader eyebrow={`${selectedDemoCase?.caseRecord.case_id ?? selected.id} · ${t("AI-assisted imaging output")}`} title="Image / Annotation" description="Static placeholders for imaging review. These are not diagnostic images." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <div className="imaging-grid">
        <ImagingPlaceholder label="Original MRI study" />
        <ImagingPlaceholder label="Segmentation overlay" annotated />
        <ImagingPlaceholder label="Annotated region view" annotated />
        <ImagingPlaceholder label="Follow-up comparison" />
      </div>
      <PanelCard title="Image quality decision" subtitle={`Protocol ${selectedView.structuredVisualView.protocolStatus} · Quality ${selectedView.structuredVisualView.imageQualityStatus}`}>
        <ReviewActions item={selected} isActionable={isActionable} onAction={onAction} />
      </PanelCard>
    </>
  );

  if (activeView === "findings") return (
    <>
      <PageHeader eyebrow={`${selectedDemoCase?.caseRecord.case_id ?? selected.id} · ${t("evidence review")}`} title="Quantitative Findings" description="Review imported volumetry, corticometry, and normative comparison as imaging evidence, not diagnosis." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <DemoReportWorkspace role="radiologist" title="Selected imported case quantitative evidence" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector />
    </>
  );

  if (activeView === "draft") return (
    <>
      <PageHeader eyebrow={`${selectedDemoCase?.caseRecord.case_id ?? selected.id} · ${t("Quantitative draft")}`} title="Quantitative Report Draft" description="This draft requires Radiologist review and is not diagnostic or patient-visible output." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <DemoReportWorkspace role="radiologist" title="Selected imported case draft report context" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector />
    </>
  );

  if (activeView === "comments") return (
    <>
      <PageHeader eyebrow={`${selectedDemoCase?.caseRecord.case_id ?? selected.id} · ${t("review communication")}`} title="Comments" description="Add imaging-review context for the governed handoff to Physician Review." />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <PanelCard title="Radiology note" subtitle="Local prototype note for the selected imported case">
        <textarea className="note-area" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("Add imaging limitations or clarification...")} />
        <div className="button-row"><button className="primary-button" onClick={() => onAction("rad-comment", selectedDemoCase?.caseRecord.case_id ?? selected.id, comment)}>{t("Save comment")}</button></div>
        <div className="prototype-note"><strong>{t("Selected imported case")}</strong><p>{selectedDemoCase ? `${displayDemoPatientName(selectedDemoCase)} · ${selectedDemoCase.caseRecord.case_id}` : t("No imported case selected.")}</p></div>
      </PanelCard>
    </>
  );

  return (
    <>
      <PageHeader eyebrow={`${selectedDemoCase?.caseRecord.case_id ?? selected.id} · ${t("Case Review Room")}`} title={t("Imaging review for {name}", { name: selectedDemoCase ? displayDemoPatientName(selectedDemoCase) : selected.patientName })} description="Determine whether AI-assisted imaging output is technically and radiologically reliable enough for physician interpretation." action={<StatusChip label={selectedDemoCase?.caseRecord.case_state ?? selected.radiologistStatus} />} />
      {selectedDemoCase ? <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={selectedDemoCase} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} /> : null}
      <div className="review-tabs">
        {["snapshot", "evidence", "report"].map((tab) => <button key={tab} className={roomTab === tab ? "active" : ""} onClick={() => setRoomTab(tab)}>{t(tab[0].toUpperCase() + tab.slice(1))}</button>)}
      </div>
      {roomTab === "snapshot" ? <DemoReportWorkspace role="radiologist" title="Selected imported case review context" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector /> : null}
      {roomTab === "evidence" ? <DemoReportWorkspace role="radiologist" title="Selected imported case evidence layers" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector /> : null}
      {roomTab === "report" ? <DemoReportWorkspace role="radiologist" title="Selected imported case report handoff" selectedCaseId={selectedCaseId} onSelectedCaseIdChange={setSelectedCaseId} hideCaseSelector /> : null}
      <div className="sticky-actions"><span><strong>{t("Primary decision")}</strong> {isActionable ? t("Complete imaging review or request reprocess.") : t("Read-only completed review. Open an active queue item for action.")}</span><ReviewActions item={selected} isActionable={isActionable} onAction={onAction} /></div>
    </>
  );
}

function RadiologistCaseContextBar({
  summaries,
  detail,
  selectedCaseId,
  onSelectCase,
}: {
  summaries: DemoCaseSummary[];
  detail: DemoCaseDetail;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
}) {
  const { t, tv, formatNumber } = useI18n();
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSummaries = normalizedSearch
    ? summaries.filter((summary) => {
      const haystack = [
        summary.caseRecord.case_id,
        summary.caseRecord.accession_number,
        summary.patient.name,
        summary.patient.name_fa,
        summary.patient.source_patient_id,
        summary.caseRecord.primary_module,
        summary.caseRecord.protocol,
        ...summary.reports.map((report) => `${report.report_type} ${report.title} ${report.module}`),
        ...summary.modules.map((module) => `${module.module_id} ${module.display_name}`),
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    : summaries;
  const moduleLabels = detail.modules.map((module) => tv(module.display_name));
  return (
    <section className="radiologist-case-context-bar" aria-label={t("Active imported case context")}>
      <div className="case-context-primary">
        <p>{t("Active imported case")}</p>
        <h2>{displayDemoPatientName(detail)}</h2>
        <span>
          <span dir="ltr">{detail.patient.source_patient_id}</span>
          {" · "}
          {formatNumber(detail.patient.age_at_study)} {t("years")}
          {" · "}
          {tv(demoSexLabel(detail.patient.sex))}
          {" · "}
          {detail.caseRecord.study_date}
        </span>
      </div>
      <div className="case-context-switcher">
        <label>
          {t("Search imported cases")}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Patient, ID, case, or module")}
          />
        </label>
        <label>
          {t("Active case")}
          <select value={selectedCaseId} onChange={(event) => onSelectCase(event.target.value)}>
            {filteredSummaries.map((summary) => (
              <option key={summary.caseRecord.case_id} value={summary.caseRecord.case_id}>
                {displayDemoPatientName(summary)} · {summary.caseRecord.case_id} · {summary.caseRecord.primary_module}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="case-context-facts">
        <div><span>{t("Case ID")}</span><strong dir="ltr">{detail.caseRecord.case_id}</strong></div>
        <div><span>{t("Report modules")}</span><strong>{moduleLabels.length ? moduleLabels.join(" · ") : t("Not recorded")}</strong></div>
        <div><span>{t("AI status")}</span><StatusChip label={detail.caseRecord.ai_processing_status} /></div>
        <div><span>{t("QC status")}</span><StatusChip label={detail.caseRecord.qc_state} /></div>
        <div><span>{t("Outliers")}</span><StatusChip label={`${formatNumber(detail.outlierCount)} ${t("outliers")}`} tone={detail.outlierCount ? "attention" : "good"} /></div>
      </div>
    </section>
  );
}

function displayDemoPatientName(summary: Pick<DemoCaseSummary, "patient">): string {
  return summary.patient.name_fa || summary.patient.name;
}

function demoSexLabel(sex: string): string {
  if (sex === "F") return "Female";
  if (sex === "M") return "Male";
  return sex;
}

function RadiologistReportWorkspace({ item, view }: { item: KioCase; view: RadiologistCaseReviewView }) {
  const { t, tv } = useI18n();
  const biomarkerView = view.biomarkerView;
  const topMetrics = biomarkerView.metricRows.slice(0, 5);
  return (
    <ReportWorkspaceShell
      eyebrow="Interactive radiology report workspace"
      title="AI-assisted evidence review, not a static PDF"
      description="Validate quantitative outputs, segmentation QC, structured visual assessment, and radiologist handoff from one layered review surface."
      layers={[
        { label: "AI Quantitative Evidence", status: biomarkerView.aiProcessingStatus, detail: biomarkerView.outputSummaries.length ? `${biomarkerView.outputSummaries.length} output object(s)` : "No structured output", tone: biomarkerView.metricRows.length ? "good" : "attention" },
        { label: "Segmentation & QC", status: biomarkerView.segmentationQc?.status ?? "Pending", detail: biomarkerView.segmentationQc?.radiologistAcceptanceStatus ?? "Acceptance pending", tone: biomarkerView.segmentationQc?.suitableForPhysicianHandoff ? "good" : "attention" },
        { label: "Structured Visual Assessment", status: view.structuredVisualView.assessmentStatus, detail: `${view.structuredVisualView.visualScoreRows.length} visual score row(s)`, tone: view.structuredVisualView.blocked ? "attention" : "info" },
        { label: "Radiologist Handoff", status: view.handoffStatus ?? "Pending", detail: view.handoffSummary ? "Summary available" : "Not handed off", tone: view.handoffSummary ? "good" : "attention" },
      ]}
      sidebar={
        <>
          <ReportReadinessChecklist
            title="Report readiness checklist"
            items={[
              { label: "Volumetry report layer", status: biomarkerView.availability.volumetry ? "Available" : "Not available", detail: "Structured output, not PDF source" },
              { label: "Corticometry report layer", status: biomarkerView.availability.corticometry ? "Available" : "Not available" },
              { label: "AD / HOC summary", status: biomarkerView.availability.adRelevant ? "Available" : "Not available" },
              { label: "Longitudinal comparison", status: biomarkerView.availability.longitudinal ? "Available" : "Not available" },
              { label: "Suitable for physician handoff", status: biomarkerView.segmentationQc?.suitableForPhysicianHandoff ? "Ready" : "Not ready" },
            ]}
          />
          <SuppressedEvidenceNotice suppressedCount={biomarkerView.suppressedCount} invalidCount={biomarkerView.invalidCount} />
          <EvidenceProvenanceStrip items={[
            { label: "Algorithm", value: biomarkerView.algorithmVersion ?? item.outputVersion, detail: "Decision-support only" },
            { label: "Reference dataset", value: biomarkerView.referenceDatasetVersion ?? "Not recorded", detail: "Displayed for traceability" },
            { label: "Report objects", value: view.structuredReportRefs.length ? `${view.structuredReportRefs.length}` : "0", detail: "Referenced by ID" },
          ]} />
        </>
      }
    >
      <InteractiveReportPreview title="Quantitative report layers" description="Volumetry, corticometry, AD-relevant markers, and longitudinal evidence are reviewed as structured data before any report rendering.">
        <div className="report-workspace-mini-grid">
          {biomarkerView.outputSummaries.length ? biomarkerView.outputSummaries.map((summary) => (
            <div className="report-layer-card" key={summary.outputId}>
              <h3>{tv(summary.outputType)}</h3>
              <div className="status-list compact">
                <div><span>{t("Status")}</span><StatusChip label={summary.status} /></div>
                <div><span>{t("Review")}</span><StatusChip label={summary.reviewStatus} /></div>
                <div><span>{t("Version")}</span><strong className="bidi-isolate">{summary.version}</strong></div>
              </div>
            </div>
          )) : <EmptyState title="AI output is pending review" message="Structured biomarker output will appear here after processing and QC." />}
        </div>
      </InteractiveReportPreview>
      <div className="split-layout">
        <EvidenceSection eyebrow="Key quantitative rows" title="Biomarker evidence extracted from reports" description="Suppressed or invalid values are not promoted as normal findings.">
          {topMetrics.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("Report layer")}</th><th>{t("Metric")}</th><th>{t("Value")}</th><th>{t("Percentile")}</th><th>{t("Validity")}</th></tr></thead>
                <tbody>{topMetrics.map((metric) => <tr key={metric.id}><td><StatusChip label={metric.outputType} /></td><td><strong>{tv(metric.label)}</strong><small>{tv(metric.region)}</small></td><td className="bidi-isolate">{metric.valueLabel}</td><td>{typeof metric.percentile === "number" ? <PercentileBar value={metric.percentile} /> : "—"}</td><td><StatusChip label={metric.validityStatus} /></td></tr>)}</tbody>
              </table>
            </div>
          ) : <EmptyState title="No quantitative rows ready" message={biomarkerView.emptyReason ?? "AI output is pending review."} />}
        </EvidenceSection>
        <EvidenceSection eyebrow="Structured visual report" title="Visual MRI assessment layer" description="MTA, Fazekas, Koedam, and GCA stay separate from AI biomarker metrics.">
          <div className="ai-boundary"><strong>{t("Structured visual MRI review")}</strong><p>{tv(view.structuredVisualView.atrophySummary)}. {tv(view.structuredVisualView.vascularSummary)}</p></div>
          {view.structuredVisualView.visualScoreRows.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>{t("Score")}</th><th>{t("Side")}</th><th>{t("Value")}</th><th>{t("Confidence")}</th></tr></thead>
                <tbody>{view.structuredVisualView.visualScoreRows.slice(0, 6).map((score) => <tr key={score.id}><td>{tv(score.label)}</td><td>{tv(score.side)}</td><td className="bidi-isolate">{score.value ?? "—"}</td><td><StatusChip label={score.confidence} /></td></tr>)}</tbody>
              </table>
            </div>
          ) : <EmptyState title="Visual assessment pending" message="Visual rating rows appear after structured radiology review." />}
        </EvidenceSection>
      </div>
      <EvidenceSection eyebrow="Radiologist handoff" title="Ready-to-synthesize imaging summary" description="The handoff packages reviewed imaging evidence for physician interpretation.">
        <div className="report-workspace-mini-grid">
          <div className="report-layer-card"><h3>{t("Imaging summary")}</h3><p>{view.handoffSummary ? tv(view.handoffSummary) : t("Pending radiologist handoff.")}</p></div>
          <div className="report-layer-card"><h3>{t("Limitations")}</h3><p>{view.limitations.length ? formatTranslatedList(view.limitations, tv) : t("No limitation summary available.")}</p></div>
        </div>
      </EvidenceSection>
    </ReportWorkspaceShell>
  );
}

function ReviewSnapshot({ item, view }: { item: KioCase; view: RadiologistCaseReviewView }) {
  const { t, tv } = useI18n();
  const biomarkerView = view.biomarkerView;
  return (
    <div className="stack">
      <CaseIdentity item={item} />
      <CaseWorkflowSummary
        stateLabel={view.header.stateLabel}
        owner={view.header.currentOwner}
        nextAction={view.header.nextAction}
        patientVisibility="Hidden from Patient"
        readiness={view.structuredVisualView.blocked ? "Blocked" : view.structuredVisualView.readinessSatisfied ? "Ready" : "Waiting"}
      />
      <div className="status-list"><div><span>{t("Image quality")}</span><StatusChip label={biomarkerView.mriQualityStatus ?? item.imageQuality} /></div><div><span>{t("Segmentation")}</span><StatusChip label={biomarkerView.segmentationQc?.status ?? (item.aiStatus === "AI output ready" ? "Ready for review" : item.aiStatus)} /></div><div><span>{t("AI processing")}</span><StatusChip label={biomarkerView.aiProcessingStatus} /></div><div><span>{t("Algorithm")}</span><StatusChip label={biomarkerView.algorithmVersion ?? item.outputVersion} /></div><div><span>{t("Review status")}</span><StatusChip label={item.radiologistStatus} /></div><div><span>{t("Handoff")}</span><StatusChip label={handoffLabel(item)} /></div><div><span>{t("Reprocess reason")}</span><StatusChip label={biomarkerView.segmentationQc?.reprocessingRecommended ? "Recommended" : "Not requested"} /></div></div>
      <WorkflowReadinessPanel items={[
        { label: "Volumetry", status: biomarkerView.availability.volumetry ? "Available" : "Not available" },
        { label: "Corticometry", status: biomarkerView.availability.corticometry ? "Available" : "Not available" },
        { label: "AD / HOC metrics", status: biomarkerView.availability.adRelevant ? "Available" : "Not available" },
        { label: "Longitudinal", status: biomarkerView.availability.longitudinal ? "Available" : "Not available" },
        { label: "Protocol completeness", status: view.structuredVisualView.protocolStatus },
        { label: "Visual assessment", status: view.structuredVisualView.assessmentStatus },
        { label: "Radiologist handoff", status: view.handoffStatus ?? "Pending" },
      ]} />
      <EvidenceSection eyebrow="Structured visual assessment" title="Radiologist-reviewed imaging pattern" description="Visual ratings remain imaging evidence and are not diagnosis.">
        <div className="ai-boundary"><strong>{t("Structured visual MRI review")}</strong><p>{tv(view.structuredVisualView.atrophySummary)}. {tv(view.structuredVisualView.vascularSummary)}</p></div>
      </EvidenceSection>
      {view.structuredVisualView.visualScoreRows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t("Visual score")}</th><th>{t("Side")}</th><th>{t("Value")}</th><th>{t("Confidence")}</th></tr></thead>
            <tbody>{view.structuredVisualView.visualScoreRows.slice(0, 6).map((score) => <tr key={score.id}><td>{tv(score.label)}</td><td>{tv(score.side)}</td><td className="bidi-isolate">{score.value ?? "—"}</td><td><StatusChip label={score.confidence} /></td></tr>)}</tbody>
          </table>
        </div>
      ) : <EmptyState title="Visual assessment pending" message="MTA, Fazekas, Koedam, and GCA rows appear after structured visual review." />}
      <div className="ai-boundary"><strong>{t("Quality decision / limitation summary")}</strong><p>{item.imageQuality === "Acceptable" ? tv(item.radiologistComment) || t("Image quality acceptable. Add limitations before handoff if needed.") : tv(item.radiologistComment) || t("Image quality requires review before clinical interpretation.")}</p></div>
      {biomarkerView.segmentationQc?.issues.length ? <div className="prototype-note"><strong>{t("Segmentation QC issue")}</strong><p>{formatTranslatedList(biomarkerView.segmentationQc.issues, tv)}</p></div> : null}
      <div className="ai-boundary"><strong>{t("AI-assisted quantitative evidence")}</strong><p>{t("Quantitative output supports review; it is not final clinical interpretation.")}</p></div>
      <div className="tag-list">{item.keyFindings.length ? item.keyFindings.map((finding) => <span key={finding}>{tv(finding)}</span>) : <span>{t("No findings available until processing completes")}</span>}</div>
    </div>
  );
}

function FindingsTable({ item, biomarkerView }: { item: KioCase; biomarkerView: RadiologistBiomarkerReviewView }) {
  const { t, tv } = useI18n();
  if (!biomarkerView.metricRows.length) return <EmptyState title="No quantitative findings" message={biomarkerView.emptyReason ?? "No structured biomarker output is available for this case."} />;
  return (
    <PanelCard title="Quantitative findings" subtitle="AI-assisted values requiring Radiologist review">
      <div className="table-wrap"><table><thead><tr><th>{t("Region")}</th><th>{t("Value")}</th><th>{t("Percentile")}</th><th>{t("Reference comparison")}</th><th>{t("Validity")}</th><th>{t("Output")}</th></tr></thead><tbody>{biomarkerView.metricRows.map((metric) => <tr key={metric.id}><td><strong>{tv(metric.region)}</strong><small>{tv(metric.label)}</small></td><td className="bidi-isolate">{metric.valueLabel}</td><td>{typeof metric.percentile === "number" ? <PercentileBar value={metric.percentile} /> : "—"}</td><td>{tv(metric.comparisonLabel)}</td><td><StatusChip label={metric.validityStatus} /></td><td><StatusChip label={metric.outputType} tone="pending" /></td></tr>)}</tbody></table></div>
      <WorkflowReadinessPanel items={[
        { label: "AI output readiness", status: biomarkerView.aiProcessingStatus },
        { label: "Segmentation QC", status: biomarkerView.segmentationQc?.status ?? "Pending" },
        { label: "Suppressed metrics", status: biomarkerView.suppressedCount ? `${biomarkerView.suppressedCount}` : "None" },
        { label: "Invalid metrics", status: biomarkerView.invalidCount ? `${biomarkerView.invalidCount}` : "None" },
        { label: "Physician handoff", status: biomarkerView.outputSummaries.some((summary) => summary.suitableForPhysicianReview) ? "Ready" : "Not ready" },
      ]} />
      {biomarkerView.suppressedCount || biomarkerView.invalidCount ? <div className="prototype-note"><strong>{t("Suppressed or invalid metrics hidden")}</strong><p>{t("Suppressed or invalid metrics are not shown as normal quantitative findings.")}</p></div> : null}
    </PanelCard>
  );
}

function FindingsView({ item, biomarkerView, onAction }: { item: KioCase; biomarkerView: RadiologistBiomarkerReviewView; onAction: Props["onAction"] }) {
  const { t } = useI18n();
  const isActionable = /review pending|needs quality review/i.test(item.radiologistStatus);
  return (
    <>
      <PageHeader eyebrow={`${item.id} · ${t("evidence review")}`} title="Quantitative Findings" description="Review volumetry and normative comparison as imaging evidence, not diagnosis." action={<StatusChip label="AI-assisted · pending review" />} />
      <FindingsTable item={item} biomarkerView={biomarkerView} />
      <ReviewActions item={item} isActionable={isActionable} onAction={onAction} />
    </>
  );
}

function handoffLabel(item: KioCase) {
  if (/radiologist reviewed/i.test(item.radiologistStatus) && /review pending|physician reviewed/i.test(item.neurologistStatus)) return "Already handed off";
  if (/review pending|needs quality review/i.test(item.radiologistStatus)) return "Ready for Physician Review after approval";
  if (/reprocess/i.test(item.radiologistStatus)) return "Blocked by reprocess";
  return "Not ready";
}

function formatTranslatedList(items: string[], tv: (value?: string | number) => string) {
  return items.map((item) => tv(item).replace(/[.。]+$/u, "")).join(" · ");
}

function ReviewActions({ item, isActionable, onAction }: { item: KioCase; isActionable: boolean; onAction: Props["onAction"] }) {
  const { t } = useI18n();
  if (!isActionable) return (
    <div className="button-row">
      <button className="secondary-button" disabled>{t("Review completed / read-only")}</button>
    </div>
  );
  return (
    <div className="button-row">
      <button className="secondary-button" onClick={() => onAction("reprocess", item.id)}>{t("Request reprocess")}</button>
      <button className="secondary-button" onClick={() => onAction("quality-issue", item.id)}>{t("Flag quality issue")}</button>
      <button className="primary-button" onClick={() => onAction("approve-rad", item.id)}>{t("Approve for physician review")}</button>
    </div>
  );
}
