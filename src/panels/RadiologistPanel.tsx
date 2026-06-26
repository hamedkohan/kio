import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, MetricCard, PageHeader, PanelCard, ReportReadinessChecklist, StatusChip } from "../components/ui";
import { LongitudinalPanel, QuantitativeMetricsPanel, VisualScoresPanel } from "../components/DemoReportWorkspace";
import { CentileCurvesSection } from "../components/CentileCurves";
import { getDemoCaseDetail, getDemoCaseSummaries, getKeyMetrics, isOutlierMetric, sortMetricsForReview } from "../data/kio-demo/repository";
import { BrainViewer3D } from "../components/BrainViewer3D";
import type { DemoCaseDetail, DemoCaseSummary, DemoQuantitativeMetric } from "../data/kio-demo/types";
import type { RadiologistCaseReviewView } from "../domain";

type Props = {
  caseViews: RadiologistCaseReviewView[];
  activeView: string;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onAction: (action: string, caseId: string, value?: string) => void;
};

export const radiologistNav = [
  { id: "queue", label: "Review Queue" },
  { id: "room", label: "Case Review Room" },
  { id: "visual", label: "Visual Findings" },
  { id: "findings", label: "Quantitative Findings" },
  { id: "images", label: "Image / Annotation" },
  { id: "draft", label: "Report Draft" },
  { id: "comments", label: "Notes" },
  { id: "completed", label: "Completed Reviews" },
  { id: "aiqa", label: "AI QA Workbench" },
];

// The Radiologist panel is driven by one active imported demo case (selectedCaseId).
// The sticky case context bar is the only case-changing mechanism inside the workflow.
export function RadiologistPanel({ activeView, onAction }: Props) {
  const { t } = useI18n();
  const demoCaseSummaries = useMemo(() => getDemoCaseSummaries(), []);
  const [selectedCaseId, setSelectedCaseId] = useState(demoCaseSummaries[0]?.caseRecord.case_id ?? "");
  const detail =
    getDemoCaseDetail(selectedCaseId) ??
    (demoCaseSummaries[0] ? getDemoCaseDetail(demoCaseSummaries[0].caseRecord.case_id) : undefined);
  const [comment, setComment] = useState("");

  if (!detail) {
    return <EmptyState title="No imported cases available" message="The Kio demo report data pack did not load any case records." />;
  }

  const profile = getCaseProfile(detail);
  const activeCaseId = detail.caseRecord.case_id;
  const contextBar = (
    <RadiologistCaseContextBar summaries={demoCaseSummaries} detail={detail} selectedCaseId={activeCaseId} onSelectCase={setSelectedCaseId} />
  );

  if (activeView === "queue") {
    return (
      <>
        <PageHeader eyebrow="Radiologist worklist" title="Review Queue" description="Imported MRI cases awaiting or completing radiologist review. Select a case to open it in the review workflow." />
        {contextBar}
        <ReviewQueue summaries={demoCaseSummaries} selectedCaseId={activeCaseId} onSelectCase={setSelectedCaseId} />
      </>
    );
  }

  if (activeView === "visual") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("Structured visual MRI review")}`} title="Visual Findings" description="Visual MRI dementia protocol scoring and narrative radiology findings for the selected case." />
        {contextBar}
        <VisualFindingsTab detail={detail} profile={profile} />
      </>
    );
  }

  if (activeView === "findings") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("evidence review")}`} title="Quantitative Findings" description="Imported volumetry and corticometry evidence with normative comparison. Decision support only, not diagnosis." />
        {contextBar}
        <QuantitativeFindingsTab detail={detail} profile={profile} />
      </>
    );
  }

  if (activeView === "images") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("Imaging & atrophy maps")}`} title="Image / Annotation" description="AI-rendered atrophy maps for the selected case. Not a diagnostic DICOM viewer." />
        {contextBar}
        <ImageAnnotationTab detail={detail} />
      </>
    );
  }

  if (activeView === "draft") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("Quantitative draft")}`} title="Report Draft" description="Draft generated from imported case data. Requires radiologist review; not a final or patient-visible output." />
        {contextBar}
        <ReportDraftTab detail={detail} profile={profile} />
      </>
    );
  }

  if (activeView === "comments") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("review communication")}`} title="Notes" description="Radiology notes for the active selected case, recorded for the governed handoff to Physician Review." />
        {contextBar}
        <PanelCard title="Radiology note for the selected case" subtitle={`${displayDemoPatientName(detail)} · ${activeCaseId}`}>
          <textarea className="note-area" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("Add imaging limitations or clarification for this selected case...")} />
          <div className="button-row"><button className="primary-button" onClick={() => onAction("rad-comment", activeCaseId, comment)}>{t("Save note")}</button></div>
          <div className="prototype-note"><strong>{t("Active selected case")}</strong><p>{displayDemoPatientName(detail)} · <span dir="ltr">{activeCaseId}</span></p></div>
        </PanelCard>
      </>
    );
  }

  if (activeView === "completed") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("Completed imaging reviews")}`} title="Completed Reviews" description="Read-only record of completed radiologist review for the selected case." />
        {contextBar}
        <CompletedReviewsTab detail={detail} />
      </>
    );
  }

  if (activeView === "aiqa") {
    return (
      <>
        <PageHeader eyebrow={`${activeCaseId} · ${t("AI QA / technical review")}`} title="AI QA Workbench" description="Technical QC and outlier inspection for the selected case before clinical handoff." />
        {contextBar}
        <AiQaTab detail={detail} />
      </>
    );
  }

  // Default: Case Review Room
  return (
    <>
      <PageHeader
        eyebrow={`${activeCaseId} · ${t("Case Review Room")}`}
        title={t("Imaging review for {name}", { name: displayDemoPatientName(detail) })}
        description="Determine whether AI-assisted imaging output is technically and radiologically reliable enough for physician interpretation."
        action={<StatusChip label={detail.caseRecord.case_state} />}
      />
      {contextBar}
      <CaseReviewRoom detail={detail} profile={profile} onAction={onAction} />
    </>
  );
}

type CaseProfile = {
  hasVisualReport: boolean;
  hasVolumetrySingle: boolean;
  hasLongitudinal: boolean;
  volumetryMetrics: DemoQuantitativeMetric[];
  corticometryMetrics: DemoQuantitativeMetric[];
  kindLabel: string;
};

function getCaseProfile(detail: DemoCaseDetail): CaseProfile {
  const reportTypes = detail.reports.map((report) => String(report.report_type));
  const hasVisualReport = reportTypes.some((type) => type.includes("visual")) || detail.visualScores.length > 0;
  const hasLongitudinal = reportTypes.some((type) => type.includes("longitudinal")) || detail.longitudinal;
  const hasVolumetrySingle = reportTypes.includes("ai_volumetry_single");
  const volumetryMetrics = detail.metrics.filter((metric) => metric.domain === "volumetry");
  const corticometryMetrics = detail.metrics.filter((metric) => metric.domain === "corticometry");
  const kindLabel = hasLongitudinal
    ? "Longitudinal volumetry / corticometry"
    : hasVolumetrySingle
      ? "AI volumetry (single timepoint)"
      : hasVisualReport
        ? "Visual MRI dementia protocol"
        : "Imported case";
  return { hasVisualReport, hasVolumetrySingle, hasLongitudinal, volumetryMetrics, corticometryMetrics, kindLabel };
}

function CaseReviewRoom({ detail, profile, onAction }: { detail: DemoCaseDetail; profile: CaseProfile; onAction: Props["onAction"] }) {
  const { t, tv, formatNumber } = useI18n();
  return (
    <>
      <PanelCard title="Case review snapshot" subtitle={t(profile.kindLabel)}>
        <div className="status-list">
          <div><span>{t("Patient")}</span><strong>{displayDemoPatientName(detail)}</strong></div>
          <div><span>{t("Patient ID")}</span><strong dir="ltr">{detail.patient.source_patient_id ?? detail.patient.patient_id}</strong></div>
          <div><span>{t("Age")}</span><strong>{formatNumber(detail.patient.age_at_study)} {t("years")}</strong></div>
          <div><span>{t("Sex")}</span><strong>{tv(demoSexLabel(detail.patient.sex))}</strong></div>
          <div><span>{t("Study date")}</span><strong dir="ltr">{detail.caseRecord.study_date}</strong></div>
          <div><span>{t("Case ID")}</span><strong dir="ltr">{detail.caseRecord.case_id}</strong></div>
          <div><span>{t("AI status")}</span><StatusChip label={detail.caseRecord.ai_processing_status} /></div>
          <div><span>{t("QC status")}</span><StatusChip label={detail.caseRecord.qc_state} /></div>
          <div><span>{t("Source references")}</span><strong>{formatNumber(detail.sourceAssets.length)} {t("page render(s)")}</strong></div>
          <div><span>{t("Outliers")}</span><StatusChip label={`${formatNumber(detail.outlierCount)}`} tone={detail.outlierCount ? "attention" : "good"} /></div>
        </div>
        <ReportReadinessChecklist
          title="Available report modules"
          items={detail.modules.length
            ? detail.modules.map((module) => ({ label: tv(module.display_name), status: "Available", detail: tv(module.product_promise ?? module.patient_visibility) }))
            : [{ label: t("Report modules"), status: t("Not recorded") }]}
        />
      </PanelCard>
      {profile.hasVisualReport && detail.visualScores.length ? <VisualScoresPanel scores={detail.visualScores} compact /> : null}
      <PanelCard title="Radiologist-relevant summary" subtitle="Narrative findings extracted from the imported report">
        {detail.findings.length
          ? <div className="demo-finding-grid">{detail.findings.map((finding) => <article key={finding.finding_id}><span>{tv(finding.category)}</span><strong>{tv(finding.severity)}</strong><p>{tv(finding.finding)}</p></article>)}</div>
          : <EmptyState title="No narrative findings recorded" message={t("This selected case contains structured metrics only.")} />}
      </PanelCard>
      <div className="sticky-actions">
        <span><strong>{t("Primary decision")}</strong> {t("Complete imaging review or request reprocess for the selected case.")}</span>
        <DemoReviewActions caseId={detail.caseRecord.case_id} onAction={onAction} />
      </div>
    </>
  );
}

function VisualFindingsTab({ detail, profile }: { detail: DemoCaseDetail; profile: CaseProfile }) {
  const { t, tv, formatNumber } = useI18n();
  if (!profile.hasVisualReport || !detail.visualScores.length) {
    return <EmptyState title={t("No visual MRI scoring module")} message={t("This selected case does not include a visual MRI dementia scoring module.")} />;
  }
  const hippocampalMetrics = detail.metrics.filter((metric) => metric.structure.toLowerCase().includes("hippocampus"));
  return (
    <>
      <VisualScoresPanel scores={detail.visualScores} />
      {hippocampalMetrics.length ? (
        <PanelCard title="Hippocampal volumes" subtitle="Quantitative values reported alongside the visual protocol">
          <div className="metric-grid">
            {hippocampalMetrics.map((metric) => (
              <MetricCard
                key={metric.metric_id}
                label={`${tv(metric.structure)} · ${tv(metric.hemisphere)}`}
                value={`${metric.value} ${metric.unit}`}
                detail={metric.percentile === null || metric.percentile === undefined ? t("Percentile not recorded") : `${t("Percentile")} ${formatNumber(metric.percentile)}`}
                tone={isOutlierMetric(metric) ? "attention" : "neutral"}
              />
            ))}
          </div>
        </PanelCard>
      ) : null}
      <PanelCard title="Structured radiology findings" subtitle="Impression and source wording from the visual MRI dementia protocol report">
        {detail.findings.length
          ? <div className="demo-finding-grid">{detail.findings.map((finding) => <article key={finding.finding_id}><span>{tv(finding.category)}</span><strong>{tv(finding.severity)}</strong><p>{tv(finding.finding)}</p></article>)}</div>
          : <EmptyState title="No narrative findings recorded" message={t("Visual scores are available above.")} />}
      </PanelCard>
    </>
  );
}

function QuantitativeFindingsTab({ detail, profile }: { detail: DemoCaseDetail; profile: CaseProfile }) {
  const { t, tv, formatNumber } = useI18n();

  // Longitudinal volumetry / corticometry (e.g. Nima Mohseni)
  if (profile.hasLongitudinal) {
    const topChanged = sortMetricsForReview(detail.metrics.filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined)).slice(0, 8);
    const volumetryLong = sortMetricsForReview(profile.volumetryMetrics).slice(0, 60);
    const corticometryLong = sortMetricsForReview(profile.corticometryMetrics).slice(0, 60);
    return (
      <>
        <HeadlineCards detail={detail} />
        {topChanged.length ? <LongitudinalPanel metrics={topChanged} /> : null}
        <OutlierPanel detail={detail} includePrevious />
        {profile.corticometryMetrics.length ? <CentileCurvesSection corticometryMetrics={profile.corticometryMetrics} patientAge={detail.patient.age_at_study} /> : null}
        {profile.volumetryMetrics.length ? <QuantitativeMetricsPanel metrics={volumetryLong} title="Longitudinal volumetry metrics" includePrevious showProgressiveDisclosure /> : null}
        {profile.corticometryMetrics.length ? <QuantitativeMetricsPanel metrics={corticometryLong} title="Longitudinal corticometry metrics" includePrevious showProgressiveDisclosure /> : null}
      </>
    );
  }

  // Single-timepoint volumetry (e.g. Mahnaz Kahnamooei)
  if (profile.hasVolumetrySingle && detail.metrics.length) {
    return (
      <>
        <HeadlineCards detail={detail} />
        <BiomarkerSummary detail={detail} />
        <OutlierPanel detail={detail} />
        <QuantitativeMetricsPanel metrics={getKeyMetrics(detail.metrics)} title="Volumetry metrics" showProgressiveDisclosure />
      </>
    );
  }

  // Visual-only case that still carries a few quantitative values (e.g. Lobat Salimi)
  if (detail.metrics.length) {
    return (
      <>
        <HeadlineCards detail={detail} />
        <QuantitativeMetricsPanel metrics={detail.metrics} title="Reported quantitative values" />
        <EmptyState title={t("No full AI volumetry / corticometry module")} message={t("This selected case reports limited quantitative values (e.g. hippocampal volumes) but no full AI volumetry or corticometry module is attached.")} />
      </>
    );
  }

  return <EmptyState title={t("No quantitative module")} message={t("This selected case does not include a volumetry or corticometry module.")} />;
}

function HeadlineCards({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv, formatNumber } = useI18n();
  const headlineStructures = ["CSF", "Brain", "ICV", "Hippocampus", "HOC", "Temporal", "Parietal", "entorhinal"];
  const cards = headlineStructures
    .map((name) => findStructureMetric(detail.metrics, name))
    .filter((metric): metric is DemoQuantitativeMetric => Boolean(metric));
  if (!cards.length) return null;
  return (
    <div className="metric-grid">
      {cards.map((metric) => (
        <MetricCard
          key={metric.metric_id}
          label={tv(metric.structure)}
          value={`${metric.value} ${metric.unit}`}
          detail={[
            metric.percent_icv === null || metric.percent_icv === undefined ? null : `${metric.percent_icv}% ${t("of ICV")}`,
            metric.percentile === null || metric.percentile === undefined ? null : `${t("Percentile")} ${formatNumber(metric.percentile)}`,
          ].filter(Boolean).join(" · ") || t("Reported value")}
          tone={isOutlierMetric(metric) ? "attention" : "neutral"}
        />
      ))}
    </div>
  );
}

function BiomarkerSummary({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv, formatNumber } = useI18n();
  const keyStructures = ["Hippocampus", "Temporal", "Parietal", "entorhinal", "HOC"];
  const rows = keyStructures
    .map((name) => findStructureMetric(detail.metrics, name))
    .filter((metric): metric is DemoQuantitativeMetric => Boolean(metric));
  if (!rows.length) return null;
  return (
    <PanelCard title="Key biomarkers" subtitle="AD-relevant structures for radiologist review">
      <div className="status-list">
        {rows.map((metric) => (
          <div key={metric.metric_id}>
            <span>{tv(metric.structure)}</span>
            <strong dir="ltr">
              {metric.value} {metric.unit}
              {metric.percentile === null || metric.percentile === undefined ? "" : ` · p${formatNumber(metric.percentile)}`}
            </strong>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function OutlierPanel({ detail, includePrevious = false }: { detail: DemoCaseDetail; includePrevious?: boolean }) {
  const { t } = useI18n();
  const outliers = sortMetricsForReview(detail.outlierMetrics).slice(0, 18);
  if (!outliers.length) {
    return (
      <PanelCard title="Outlier metrics" subtitle="Percentile below 5 or above 95">
        <EmptyState title={t("No outlier metrics")} message={t("No metric in this selected case falls outside the normative display range.")} />
      </PanelCard>
    );
  }
  return <QuantitativeMetricsPanel metrics={outliers} title="Outlier metrics (percentile <5 or >95)" includePrevious={includePrevious} />;
}

function ImageAnnotationTab({ detail }: { detail: DemoCaseDetail }) {
  const { t } = useI18n();
  return (
    <>
      <PanelCard title="Image / annotation context" subtitle="No diagnostic DICOM viewer exists in this prototype">
        <div className="status-list">
          <div><span>{t("Case ID")}</span><strong dir="ltr">{detail.caseRecord.case_id}</strong></div>
          <div><span>{t("Modality")}</span><strong>{detail.caseRecord.modality}</strong></div>
        </div>
        <p className="context-copy">{t("Diagnostic imaging will be available through the platform viewer / API. Structured data is the source of truth.")}</p>
      </PanelCard>
      <BrainViewer3D title="3D atrophy brain" subtitle="Rotatable cortical surface — drag to rotate, scroll to zoom" />
    </>
  );
}

function ReportDraftTab({ detail, profile }: { detail: DemoCaseDetail; profile: CaseProfile }) {
  const { t, tv, formatNumber } = useI18n();
  const lines: string[] = [];
  lines.push(`${t("Patient")}: ${displayDemoPatientName(detail)} · ${formatNumber(detail.patient.age_at_study)} ${t("years")} · ${tv(demoSexLabel(detail.patient.sex))}`);
  lines.push(`${t("Study date")}: ${detail.caseRecord.study_date} · ${t("Case ID")}: ${detail.caseRecord.case_id}`);

  if (profile.hasVisualReport && detail.visualScores.length) {
    lines.push("");
    lines.push(`${t("Visual MRI dementia protocol scores")}:`);
    detail.visualScores.forEach((score) => lines.push(`• ${tv(score.name)} (${score.short_name}): ${formatNumber(score.value)}${score.scale ? ` / ${score.scale}` : ""}${score.side ? ` · ${tv(score.side)}` : ""}`));
    if (detail.findings.length) {
      lines.push("");
      lines.push(`${t("Narrative findings")}:`);
      detail.findings.forEach((finding) => lines.push(`• ${tv(finding.finding)}`));
    }
  }

  const hippocampusTotal = findStructureMetric(detail.metrics, "Hippocampus");
  const hocTotal = findStructureMetric(detail.metrics, "HOC");

  if (profile.hasVolumetrySingle) {
    lines.push("");
    lines.push(`${t("AI volumetry summary (single timepoint)")}:`);
    ["CSF", "Brain", "ICV"].forEach((name) => {
      const metric = findStructureMetric(detail.metrics, name);
      if (metric) lines.push(`• ${tv(metric.structure)}: ${metric.value} ${metric.unit}`);
    });
    if (hippocampusTotal) lines.push(`• ${t("Hippocampus")}: ${hippocampusTotal.value} ${hippocampusTotal.unit}${hippocampusTotal.percentile != null ? ` (p${hippocampusTotal.percentile})` : ""}`);
    if (hocTotal) lines.push(`• HOC: ${hocTotal.value}${hocTotal.percentile != null ? ` (p${hocTotal.percentile})` : ""}`);
    const outliers = sortMetricsForReview(detail.outlierMetrics).slice(0, 6);
    if (outliers.length) {
      lines.push("");
      lines.push(`${t("Major percentile outliers")}:`);
      outliers.forEach((metric) => lines.push(`• ${tv(metric.structure)} · ${tv(metric.hemisphere)}: ${metric.value} ${metric.unit}${metric.percentile != null ? ` (p${metric.percentile})` : ""}`));
    }
  }

  if (profile.hasLongitudinal) {
    lines.push("");
    lines.push(`${t("Longitudinal volumetry / corticometry summary")}:`);
    const topChanged = sortMetricsForReview(detail.metrics.filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined)).slice(0, 8);
    topChanged.forEach((metric) => lines.push(`• ${tv(metric.structure)} · ${tv(metric.hemisphere)} (${metric.domain}): ${metric.previous_value ?? 0} → ${metric.value} ${metric.unit}${metric.change_percent != null ? ` (${metric.change_percent}%)` : ""}`));
  }

  if (lines.length <= 2) {
    lines.push("");
    lines.push(t("Imported structured data is available for this case; review the evidence tabs for details."));
  }

  return (
    <>
      <PanelCard title="AI-assisted report draft" subtitle="Generated from imported case data for radiologist review">
        <pre className="report-draft-text" dir="auto">{lines.join("\n")}</pre>
      </PanelCard>
      <div className="ai-boundary">
        <strong>{t("Safety boundary")}</strong>
        <ul>
          <li>{t("AI-assisted evidence supports radiologist review.")}</li>
          <li>{t("This is not a final diagnosis.")}</li>
          <li>{t("Specialist interpretation is required.")}</li>
        </ul>
      </div>
    </>
  );
}

function CompletedReviewsTab({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv } = useI18n();
  const reviewed = /synthesis|physician|report_|publication|published|signed|complete/i.test(detail.caseRecord.case_state);
  if (!reviewed) {
    return <EmptyState title={t("No completed review")} message={t("No completed radiologist review is recorded for this selected case yet.")} />;
  }
  return (
    <PanelCard title="Completed radiologist review" subtitle={`${displayDemoPatientName(detail)} · ${detail.caseRecord.case_id}`}>
      <div className="status-list">
        <div><span>{t("Case state")}</span><StatusChip label={detail.caseRecord.case_state} tone="good" /></div>
        <div><span>{t("Report status")}</span><StatusChip label={detail.caseRecord.report_state} /></div>
        <div><span>{t("AI status")}</span><StatusChip label={detail.caseRecord.ai_processing_status} /></div>
      </div>
      {detail.findings.length ? (
        <div className="demo-finding-grid">{detail.findings.map((finding) => <article key={finding.finding_id}><span>{tv(finding.category)}</span><strong>{tv(finding.severity)}</strong><p>{tv(finding.finding)}</p></article>)}</div>
      ) : null}
    </PanelCard>
  );
}

function AiQaTab({ detail }: { detail: DemoCaseDetail }) {
  const { t, formatNumber } = useI18n();
  const missingValues = detail.metrics.filter((metric) => metric.value === null || Number.isNaN(metric.value)).length;
  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Total metrics" value={detail.metricCount} detail="Rows extracted from imported report" />
        <MetricCard label="Outlier metrics" value={detail.outlierCount} detail="Percentile <5 or >95" tone={detail.outlierCount ? "attention" : "good"} />
        <MetricCard label="Missing values" value={missingValues} detail="Empty extracted values" tone={missingValues ? "attention" : "good"} />
        <MetricCard label="QC status" value={detail.caseRecord.qc_state} detail="Technical usability gate" tone={/required|pending|fail/i.test(detail.caseRecord.qc_state) ? "attention" : "good"} />
      </div>
      <PanelCard title="Technical QC for the selected case" subtitle="Local prototype QC actions">
        <div className="button-row wrap">
          <button className="secondary-button" type="button">{t("Needs QC")}</button>
          <button className="secondary-button" type="button">{t("QC Passed")}</button>
          <button className="secondary-button" type="button">{t("QC Failed")}</button>
          <button className="secondary-button" type="button">{t("Flag for review")}</button>
        </div>
        <ReportReadinessChecklist title="Technical checks" items={[
          { label: t("AI processing"), status: detail.caseRecord.ai_processing_status, detail: t("Pipeline status from imported data") },
          { label: t("Available modules"), status: `${formatNumber(detail.reports.length)}`, detail: detail.reports.map((report) => String(report.report_type)).join(" · ") },
        ]} />
      </PanelCard>
      <OutlierPanel detail={detail} includePrevious={detail.longitudinal} />
    </>
  );
}

function ReviewQueue({ summaries, selectedCaseId, onSelectCase }: { summaries: DemoCaseSummary[]; selectedCaseId: string; onSelectCase: (caseId: string) => void }) {
  const { t, tv, formatNumber } = useI18n();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>{t("Case ID")}</th><th>{t("Patient")}</th><th>{t("Module")}</th><th>{t("Case state")}</th><th>{t("Outliers")}</th><th></th></tr>
        </thead>
        <tbody>
          {summaries.map((summary) => (
            <tr key={summary.caseRecord.case_id} className={summary.caseRecord.case_id === selectedCaseId ? "selected-row" : ""}>
              <td dir="ltr">{summary.caseRecord.case_id}</td>
              <td>{displayDemoPatientName(summary)}</td>
              <td>{tv(summary.caseRecord.primary_module)}</td>
              <td><StatusChip label={summary.caseRecord.case_state} /></td>
              <td><StatusChip label={`${formatNumber(summary.outlierCount)}`} tone={summary.outlierCount ? "attention" : "good"} /></td>
              <td>
                <button type="button" className={summary.caseRecord.case_id === selectedCaseId ? "primary-button" : "secondary-button"} onClick={() => onSelectCase(summary.caseRecord.case_id)}>
                  {summary.caseRecord.case_id === selectedCaseId ? t("Active") : t("Open")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  return (
    <section className="radiologist-case-context-bar" aria-label={t("Active imported case context")}>
      <span className="rccb-label">{t("Active imported case")}</span>
      <select className="rccb-select" aria-label={t("Active case")} value={selectedCaseId} onChange={(event) => onSelectCase(event.target.value)}>
        {summaries.map((summary) => (
          <option key={summary.caseRecord.case_id} value={summary.caseRecord.case_id}>
            {displayDemoPatientName(summary)} · {summary.caseRecord.case_id}
          </option>
        ))}
      </select>
      <StatusChip label={`${formatNumber(detail.outlierCount)} ${t("outliers")}`} tone={detail.outlierCount ? "attention" : "good"} />
    </section>
  );
}

function DemoReviewActions({ caseId, onAction }: { caseId: string; onAction: Props["onAction"] }) {
  const { t } = useI18n();
  return (
    <div className="button-row">
      <button className="secondary-button" onClick={() => onAction("reprocess", caseId)}>{t("Request reprocess")}</button>
      <button className="secondary-button" onClick={() => onAction("quality-issue", caseId)}>{t("Flag quality issue")}</button>
      <button className="primary-button" onClick={() => onAction("approve-rad", caseId)}>{t("Approve for physician review")}</button>
    </div>
  );
}

function findStructureMetric(metrics: DemoQuantitativeMetric[], name: string): DemoQuantitativeMetric | undefined {
  const lower = name.toLowerCase();
  return (
    metrics.find((metric) => metric.structure.toLowerCase() === lower && (metric.hemisphere === "total" || metric.hemisphere === "global" || metric.hemisphere === "midline")) ??
    metrics.find((metric) => metric.structure.toLowerCase() === lower)
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
