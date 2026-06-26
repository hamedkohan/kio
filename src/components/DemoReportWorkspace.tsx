import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  getAssetUrl,
  getDemoCaseDetail,
  getDemoCaseSummaries,
  getKeyMetrics,
  getResearchDemoCases,
  getSafePatientDemoCases,
  getVisibleCaseDataForRole,
  isOutlierMetric,
  isPublishedForPatient,
  sortMetricsForReview,
} from "../data/kio-demo/repository";
import type { DemoCaseDetail, DemoCaseSummary, DemoQuantitativeMetric, DemoReport, DemoUserRole, DemoVisualScore } from "../data/kio-demo/types";
import { EmptyState, EvidenceLayerTabs, EvidenceSection, MetricCard, PanelCard, PercentileBar, ReportReadinessChecklist, StatusChip } from "./ui";

type DemoWorkspaceRole = "operations" | "radiologist" | "aiqa" | "physician" | "patient" | "research";

const roleToSeedRole: Record<DemoWorkspaceRole, DemoUserRole> = {
  operations: "operations_coordinator",
  radiologist: "radiologist",
  aiqa: "mri_scientist_ai_qa",
  physician: "neurologist_physician",
  patient: "patient",
  research: "researcher",
};

export function DemoReportWorkspace({
  role,
  title,
  selectedCaseId,
  onSelectedCaseIdChange,
  hideCaseSelector = false,
}: {
  role: DemoWorkspaceRole;
  title?: string;
  selectedCaseId?: string;
  onSelectedCaseIdChange?: (caseId: string) => void;
  hideCaseSelector?: boolean;
}) {
  const { t } = useI18n();
  const summaries = useMemo(() => getDemoCaseSummaries(), []);
  const defaultCaseId = role === "patient" ? getSafePatientDemoCases()[0]?.caseRecord.case_id ?? summaries[0]?.caseRecord.case_id : summaries[0]?.caseRecord.case_id;
  const [internalSelectedCaseId, setInternalSelectedCaseId] = useState(defaultCaseId);
  const activeSelectedCaseId = selectedCaseId ?? internalSelectedCaseId;
  const setActiveSelectedCaseId = onSelectedCaseIdChange ?? setInternalSelectedCaseId;
  const selected = activeSelectedCaseId ? getDemoCaseDetail(activeSelectedCaseId) : undefined;

  if (!selected) {
    return <EmptyState title="No demo cases available" message="The Kio legacy report data pack did not load any case records." />;
  }

  if (role === "patient") return <PatientDemoWorkspace cases={getSafePatientDemoCases()} selected={selected} selectedCaseId={activeSelectedCaseId} onSelect={setActiveSelectedCaseId} title={title} hideCaseSelector={hideCaseSelector} />;
  if (role === "research") return <ResearchDemoWorkspace title={title} />;

  return (
    <section className="demo-report-workspace">
      <div className="demo-workspace-heading">
        <div>
          <p className="eyebrow">{t("Legacy report data pack")}</p>
          <h2>{t(title ?? "Interactive structured report cases")}</h2>
          <span>{t("These sold PDF-style outputs are loaded as structured, searchable, role-aware case workspaces.")}</span>
        </div>
        <StatusChip label={`${summaries.length} ${t("demo cases")}`} tone="info" />
      </div>
      {!hideCaseSelector ? <DemoCaseSelector summaries={summaries} selectedCaseId={selected.caseRecord.case_id} onSelect={setActiveSelectedCaseId} /> : null}
      {role === "operations" ? <OperationsDemoDetail detail={selected} /> : null}
      {role === "radiologist" ? <RadiologistDemoDetail detail={selected} /> : null}
      {role === "aiqa" ? <AiQaDemoDetail detail={selected} /> : null}
      {role === "physician" ? <PhysicianDemoDetail detail={selected} /> : null}
    </section>
  );
}

function DemoCaseSelector({ summaries, selectedCaseId, onSelect }: { summaries: DemoCaseSummary[]; selectedCaseId: string; onSelect: (caseId: string) => void }) {
  const { t, tv, formatNumber } = useI18n();
  return (
    <div className="demo-case-selector" aria-label={t("Demo report cases")}>
      {summaries.map((summary) => (
        <button key={summary.caseRecord.case_id} type="button" className={summary.caseRecord.case_id === selectedCaseId ? "active" : ""} onClick={() => onSelect(summary.caseRecord.case_id)}>
          <span className="demo-case-id" dir="ltr">{summary.caseRecord.case_id}</span>
          <strong>{displayPatientName(summary)}</strong>
          <small>{tv(summary.caseRecord.protocol ?? summary.caseRecord.primary_module)} · {formatNumber(summary.patient.age_at_study)} {t("years")}</small>
          <div className="button-row wrap">
            <StatusChip label={summary.caseRecord.case_state} />
            <StatusChip label={`${formatNumber(summary.reports.length)} ${t("modules")}`} tone="info" />
            {summary.outlierCount ? <StatusChip label={`${formatNumber(summary.outlierCount)} ${t("outliers")}`} tone="attention" /> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function OperationsDemoDetail({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv, formatNumber } = useI18n();
  const nextOwner = detail.owner?.role ?? "operations_coordinator";
  return (
    <div className="demo-workspace-grid">
      <PanelCard title="Demo case coordination" subtitle="Operations sees routing, readiness, and module availability without clinical interpretation.">
        <div className="demo-patient-header">
          <div>
            <p>{t("Patient")}</p>
            <h3>{displayPatientName(detail)}</h3>
            <span><span dir="ltr">{detail.patient.source_patient_id}</span> · {formatNumber(detail.patient.age_at_study)} {t("years")} · {tv(sexLabel(detail.patient.sex))}</span>
          </div>
          <StatusChip label={detail.caseRecord.risk_level ?? "informational"} />
        </div>
        <ReportReadinessChecklist
          title="Operational report pipeline"
          items={[
            { label: "Study date", status: detail.caseRecord.study_date, detail: detail.caseRecord.protocol },
            { label: "AI processing", status: detail.caseRecord.ai_processing_status, detail: "Technical readiness only" },
            { label: "QC status", status: detail.caseRecord.qc_state, detail: "No segmentation or raw metric details shown here" },
            { label: "Report status", status: detail.caseRecord.report_state, detail: `${formatNumber(detail.reports.length)} report module(s)` },
            { label: "Publication status", status: detail.caseRecord.publication_state, detail: "Patient release coordination state" },
            { label: "Current owner", status: nextOwner, detail: detail.owner?.name ?? "Unassigned" },
          ]}
        />
      </PanelCard>
      <PanelCard title="Report modules available" subtitle="Structured replacement for legacy PDF outputs">
        <div className="demo-module-list">
          {detail.modules.map((module) => (
            <article key={module.module_id}>
              <strong>{tv(module.display_name)}</strong>
              <p>{tv(module.product_promise ?? module.patient_visibility)}</p>
              <div className="button-row wrap">{module.data_domains.map((domain) => <StatusChip key={domain} label={domain} />)}</div>
            </article>
          ))}
        </div>
      </PanelCard>
      <PanelCard title="Operational attention indicators" subtitle="Counts only, not clinical interpretation">
        <div className="metric-grid">
          <MetricCard label="Metric count" value={detail.metricCount} detail="Structured quantitative rows" />
          <MetricCard label="Outlier count" value={detail.outlierCount} detail="Percentile <5 or >95" tone={detail.outlierCount ? "attention" : "good"} />
          <MetricCard label="Visual scores" value={detail.visualScoreCount} detail="Radiology-only detail" tone={detail.visualScoreCount ? "info" : "neutral"} />
          <MetricCard label="Longitudinal" value={detail.longitudinal ? "Available" : "Not available"} detail="Two-timepoint comparison" tone={detail.longitudinal ? "info" : "neutral"} />
        </div>
      </PanelCard>
    </div>
  );
}

function RadiologistDemoDetail({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv, formatNumber } = useI18n();
  const permission = getVisibleCaseDataForRole(detail.caseRecord.case_id, "radiologist");
  const keyMetrics = getKeyMetrics(detail.metrics);
  return (
    <div className="demo-role-workspace">
      <EvidenceLayerTabs layers={[
        { label: "AI quantitative evidence", status: detail.caseRecord.ai_processing_status, detail: `${formatNumber(detail.metricCount)} structured metric(s)`, tone: detail.metricCount ? "info" : "neutral" },
        { label: "QC / segmentation validity", status: detail.caseRecord.qc_state, detail: "Radiologist validates suitability", tone: /passed|adequate/i.test(detail.caseRecord.qc_state) ? "good" : "attention" },
        { label: "Structured visual assessment", status: detail.visualScoreCount ? "Available" : "Not available", detail: `${formatNumber(detail.visualScoreCount)} visual score(s)`, tone: detail.visualScoreCount ? "good" : "neutral" },
        { label: "Physician handoff", status: detail.caseRecord.report_state, detail: "Imaging evidence only", tone: /signed|ready/i.test(detail.caseRecord.report_state) ? "good" : "info" },
      ]} />
      <div className="demo-workspace-grid">
        <PanelCard title="MRI protocol and source" subtitle={detail.caseRecord.case_title}>
          <ReportReadinessChecklist title="Report source readiness" items={[
            { label: "Protocol", status: detail.caseRecord.protocol ?? detail.caseRecord.primary_module, detail: detail.caseRecord.modality },
            { label: "Study date", status: detail.caseRecord.study_date, detail: detail.caseRecord.mri_field_strength ?? "Field strength not recorded" },
            { label: "Report modules", status: `${formatNumber(detail.reports.length)} available`, detail: detail.reports.map((report) => report.title).join(" · ") },
            { label: "Decision support boundary", status: "Not diagnosis", detail: "AI and visual scores support specialist review only" },
          ]} />
        </PanelCard>
        {permission?.canSeeVisualScores ? <VisualScoresPanel scores={detail.visualScores} /> : null}
      </div>
      <PanelCard title="Radiology narrative findings" subtitle="Clinical imaging language remains visible in radiology workspace">
        {detail.findings.length ? <div className="demo-finding-grid">{detail.findings.map((finding) => <article key={finding.finding_id}><span>{tv(finding.category)}</span><strong>{tv(finding.severity)}</strong><p>{tv(finding.finding)}</p></article>)}</div> : <EmptyState title="No narrative findings in seed" message="This report module contains structured metrics only." />}
      </PanelCard>
      <QuantitativeMetricsPanel metrics={keyMetrics} title="Key biomarker evidence extracted from legacy reports" showProgressiveDisclosure />
      <SourceReferencePanel reports={detail.reports} assets={detail.sourceAssets} />
    </div>
  );
}

function AiQaDemoDetail({ detail }: { detail: DemoCaseDetail }) {
  const { t, formatNumber } = useI18n();
  const outliers = sortMetricsForReview(detail.outlierMetrics).slice(0, 18);
  const missingValues = detail.metrics.filter((metric) => metric.value === null || Number.isNaN(metric.value)).length;
  return (
    <div className="demo-role-workspace">
      <div className="metric-grid">
        <MetricCard label="AI processing" value={detail.caseRecord.ai_processing_status} detail="Pipeline status from imported seed" tone="info" />
        <MetricCard label="QC status" value={detail.caseRecord.qc_state} detail="Technical usability gate" tone={/required|pending/i.test(detail.caseRecord.qc_state) ? "attention" : "good"} />
        <MetricCard label="Total metrics" value={detail.metricCount} detail="Rows extracted from legacy PDF tables" />
        <MetricCard label="Outlier metrics" value={detail.outlierCount} detail="Percentile <5 or >95" tone={detail.outlierCount ? "attention" : "good"} />
      </div>
      <PanelCard title="AI QA workbench" subtitle="Technical review of structured quantitative outputs">
        <div className="button-row wrap">
          <button className="secondary-button" type="button">{t("Needs QC")}</button>
          <button className="secondary-button" type="button">{t("QC Passed")}</button>
          <button className="secondary-button" type="button">{t("QC Failed")}</button>
          <button className="secondary-button" type="button">{t("Flag for review")}</button>
        </div>
        <ReportReadinessChecklist title="Technical checks" items={[
          { label: "Segmentation / validity", status: detail.caseRecord.qc_state, detail: "Prototype local state only" },
          { label: "Missing values", status: `${formatNumber(missingValues)}`, detail: "Missing extracted values in seed" },
          { label: "Source references", status: `${formatNumber(detail.sourceAssets.length)} page render(s)`, detail: "PDF pages are reference thumbnails only" },
          { label: "Available modules", status: `${formatNumber(detail.reports.length)} report(s)`, detail: detail.reports.map((report) => report.report_type).join(" · ") },
        ]} />
      </PanelCard>
      <QuantitativeMetricsPanel metrics={outliers.length ? outliers : getKeyMetrics(detail.metrics)} title="QC-focused metric table" includePrevious />
      <SourceReferencePanel reports={detail.reports} assets={detail.sourceAssets} />
    </div>
  );
}

function PhysicianDemoDetail({ detail }: { detail: DemoCaseDetail }) {
  const { t, tv, formatNumber } = useI18n();
  const keyMetrics = getKeyMetrics(detail.metrics);
  const longitudinal = sortMetricsForReview(detail.metrics.filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined)).slice(0, 12);
  return (
    <div className="demo-role-workspace">
      <PanelCard title="Clinician interpretation workspace" subtitle="Reviewed evidence is decision support and not a standalone diagnosis.">
        <div className="demo-patient-header">
          <div>
            <p>{t("Case summary")}</p>
            <h3>{detail.caseRecord.case_title}</h3>
            <span>{displayPatientName(detail)} · {formatNumber(detail.patient.age_at_study)} {t("years")} · {tv(sexLabel(detail.patient.sex))}</span>
          </div>
          <StatusChip label="Not a standalone diagnosis" tone="attention" />
        </div>
        <EvidenceLayerTabs layers={[
          { label: "Visual MRI evidence", status: detail.visualScoreCount ? "Available" : "Not available", detail: "Radiology-owned imaging evidence", tone: detail.visualScoreCount ? "good" : "neutral" },
          { label: "Quantitative evidence", status: detail.metricCount ? "Available" : "Not available", detail: `${formatNumber(detail.outlierCount)} outlier(s)`, tone: detail.outlierCount ? "attention" : "good" },
          { label: "Longitudinal change", status: detail.longitudinal ? "Available" : "Single timepoint", detail: "Current vs previous values", tone: detail.longitudinal ? "info" : "neutral" },
          { label: "Patient-safe translation", status: detail.caseRecord.publication_state, detail: "Separate release gate", tone: /published/i.test(detail.caseRecord.publication_state) ? "good" : "info" },
        ]} />
      </PanelCard>
      {detail.visualScores.length ? <VisualScoresPanel scores={detail.visualScores} compact /> : null}
      <QuantitativeMetricsPanel metrics={keyMetrics} title="Key quantitative biomarkers for clinical review" showProgressiveDisclosure />
      {longitudinal.length ? <LongitudinalPanel metrics={longitudinal} /> : null}
      <PanelCard title="Patient-safe translation boundary" subtitle="Raw percentiles, segmentation maps, and draft clinical notes are not patient-facing.">
        <ReportReadinessChecklist title="Release safety" items={[
          { label: "Publication status", status: detail.caseRecord.publication_state, detail: "Patient portal requires explicit release" },
          { label: "Technical AI output", status: "Clinician only", detail: "Not copied into patient summary" },
          { label: "Visual score tables", status: "Clinician only", detail: "Not patient-facing by default" },
          { label: "Source PDF pages", status: "Reference only", detail: "Structured data is the source of truth" },
        ]} />
      </PanelCard>
    </div>
  );
}

function PatientDemoWorkspace({ cases, selected, selectedCaseId, onSelect, title, hideCaseSelector = false }: { cases: DemoCaseDetail[]; selected: DemoCaseDetail; selectedCaseId: string; onSelect: (caseId: string) => void; title?: string; hideCaseSelector?: boolean }) {
  const { t, tv } = useI18n();
  const published = isPublishedForPatient(selected.caseRecord, selected.patient);
  return (
    <section className="demo-report-workspace patient-demo">
      <div className="demo-workspace-heading">
        <div>
          <p className="eyebrow">{t("Patient-safe report package")}</p>
          <h2>{t(title ?? "Reviewed content only after release")}</h2>
          <span>{t("Technical AI outputs, raw metric tables, and draft clinical notes are intentionally hidden here.")}</span>
        </div>
        <StatusChip label={published ? "Published to patient" : "Under care-team review"} tone={published ? "good" : "info"} />
      </div>
      {!hideCaseSelector ? <DemoCaseSelector summaries={cases} selectedCaseId={selectedCaseId} onSelect={onSelect} /> : null}
      {published ? (
        <PanelCard title="Your released report summary" subtitle="Plain language content approved for the patient portal">
          <div className="patient-report-package">
            <h2>{displayPatientName(selected)}</h2>
            <p>{t("Your care team has reviewed your imaging report. This portal shows only the approved summary layer, not the technical tables.")}</p>
            <div className="context-list">
              <div><span>{t("Study date")}</span><p>{selected.caseRecord.study_date}</p></div>
              <div><span>{t("Exam type")}</span><p>{tv(selected.caseRecord.protocol ?? selected.caseRecord.modality)}</p></div>
              <div><span>{t("What was reviewed")}</span><p>{t("MRI report information reviewed by your specialist care team.")}</p></div>
              <div><span>{t("Next step")}</span><p>{t("Discuss the reviewed summary with your physician.")}</p></div>
            </div>
          </div>
          <div className="safe-note"><strong>{t("Hidden for safety")}</strong><p>{t("Percentile tables, segmentation details, raw visual scores, research fields, and draft notes are not shown in the patient portal.")}</p></div>
        </PanelCard>
      ) : (
        <PanelCard title="Your report is being reviewed" subtitle="No technical result is shown before care-team approval">
          <p className="context-copy">{t("Your care team is reviewing your imaging results. You will only see content after it has been reviewed and approved for patient release.")}</p>
          <ReportReadinessChecklist title="Patient-safe release path" items={[
            { label: "Care-team review", status: selected.caseRecord.report_state, detail: "Still reviewed by specialists" },
            { label: "Patient release", status: selected.caseRecord.publication_state, detail: "Not yet available in this portal" },
            { label: "Technical outputs", status: "Hidden from patient portal", detail: "Clinical team only" },
          ]} />
        </PanelCard>
      )}
    </section>
  );
}

function ResearchDemoWorkspace({ title }: { title?: string }) {
  const { t, tv, formatNumber } = useI18n();
  const cases = getResearchDemoCases();
  return (
    <section className="demo-report-workspace research-demo">
      <div className="demo-workspace-heading">
        <div>
          <p className="eyebrow">{t("De-identified research view")}</p>
          <h2>{t(title ?? "Structured report availability without direct identifiers")}</h2>
          <span>{t("Research sees availability, age bucket, module presence, and outlier counts; clinical report text and patient identity are separated.")}</span>
        </div>
        <StatusChip label={`${formatNumber(cases.length)} ${t("de-identified cases")}`} tone="good" />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>{t("De-identified case")}</th><th>{t("Age bucket")}</th><th>{t("Sex")}</th><th>{t("Modules")}</th><th>{t("Metrics")}</th><th>{t("Outliers")}</th><th>{t("Longitudinal")}</th><th>{t("Eligibility")}</th></tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.researchCaseId}>
                <td dir="ltr">{item.researchCaseId}</td>
                <td dir="ltr">{item.ageBucket}</td>
                <td>{tv(sexLabel(item.patient.sex))}</td>
                <td>{item.modules.map((module) => tv(module.display_name)).join(" · ")}</td>
                <td>{formatNumber(item.metricCount)}</td>
                <td><StatusChip label={`${formatNumber(item.outlierCount)} ${t("outliers")}`} tone={item.outlierCount ? "attention" : "good"} /></td>
                <td><StatusChip label={item.longitudinal ? "Available" : "Not available"} /></td>
                <td><StatusChip label={item.caseRecord.publication_state === "research_only" ? "Research only" : "Governance placeholder"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="safe-note"><strong>{t("Research boundary")}</strong><p>{t("Research view is separated from clinical and patient publication. Export governance remains a future workflow.")}</p></div>
    </section>
  );
}

function VisualScoresPanel({ scores, compact = false }: { scores: DemoVisualScore[]; compact?: boolean }) {
  const { t, tv, formatNumber } = useI18n();
  if (!scores.length) return <PanelCard title="Structured visual scores" subtitle="No visual scoring module in this case"><EmptyState title="No visual score rows" message="This case does not contain a structured visual MRI report." /></PanelCard>;
  return (
    <PanelCard title="Structured visual MRI scores" subtitle="MTA, Fazekas, Koedam, GCA and related visual assessment rows">
      <div className={compact ? "visual-score-grid compact" : "visual-score-grid"}>
        {scores.map((score) => (
          <article key={score.score_id}>
            <span>{tv(score.short_name)}</span>
            <strong>{formatNumber(score.value)} <small>/ {score.scale}</small></strong>
            <p>{tv(score.name)}</p>
            <small>{t("Age reference")}: {tv(score.normal_for_age ?? "Not recorded")}</small>
            {score.interpretation ? <em>{tv(score.interpretation)}</em> : null}
          </article>
        ))}
      </div>
    </PanelCard>
  );
}

function QuantitativeMetricsPanel({ metrics, title, includePrevious = false, showProgressiveDisclosure = false }: { metrics: DemoQuantitativeMetric[]; title: string; includePrevious?: boolean; showProgressiveDisclosure?: boolean }) {
  const { t, tv, formatNumber } = useI18n();
  const rows = showProgressiveDisclosure ? metrics.slice(0, 10) : metrics;
  if (!metrics.length) return <PanelCard title={title} subtitle="No structured quantitative output for this case"><EmptyState title="No quantitative rows" message="This case is visual-report only or AI output is pending." /></PanelCard>;
  const table = (
    <div className="table-wrap compact-table">
      <table>
        <thead>
          <tr><th>{t("Structure")}</th><th>{t("Side")}</th><th>{t("Value")}</th><th>{t("% ICV")}</th><th>{t("Percentile")}</th>{includePrevious ? <th>{t("Previous")}</th> : null}{includePrevious ? <th>{t("Change %")}</th> : null}<th>{t("Flag")}</th></tr>
        </thead>
        <tbody>
          {rows.map((metric) => (
            <tr key={metric.metric_id}>
              <td>{tv(metric.structure)}</td>
              <td>{tv(metric.hemisphere)}</td>
              <td><span dir="ltr">{formatMetricValue(metric)}</span></td>
              <td>{metric.percent_icv === null || metric.percent_icv === undefined ? "—" : <span dir="ltr">{formatNumber(metric.percent_icv)}</span>}</td>
              <td>{metric.percentile === null || metric.percentile === undefined ? "—" : <PercentileWithFlag metric={metric} />}</td>
              {includePrevious ? <td>{metric.previous_value === null || metric.previous_value === undefined ? "—" : <span dir="ltr">{formatNumber(metric.previous_value)} {metric.unit}</span>}</td> : null}
              {includePrevious ? <td>{metric.change_percent === null || metric.change_percent === undefined ? "—" : <span dir="ltr">{formatNumber(metric.change_percent)}%</span>}</td> : null}
              <td>{isOutlierMetric(metric) ? <StatusChip label="Attention percentile" tone="attention" /> : <StatusChip label="Within display range" tone="good" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <PanelCard title={title} subtitle="Raw rows are clinician/technical-review only and not patient-facing.">
      {table}
      {showProgressiveDisclosure && metrics.length > rows.length ? (
        <details className="progressive-metrics">
          <summary>{t("View all metrics")} ({formatNumber(metrics.length)})</summary>
          <QuantitativeMetricsPanel metrics={metrics.slice(rows.length)} title="Additional metric rows" includePrevious={includePrevious} />
        </details>
      ) : null}
    </PanelCard>
  );
}

function LongitudinalPanel({ metrics }: { metrics: DemoQuantitativeMetric[] }) {
  const { t } = useI18n();
  return (
    <PanelCard title="Longitudinal change" subtitle="Current vs previous value and change percentage">
      <div className="longitudinal-card-grid">
        {metrics.slice(0, 8).map((metric) => (
          <article key={metric.metric_id}>
            <span>{metric.structure} · {metric.hemisphere}</span>
            <strong dir="ltr">{metric.change_percent ?? 0}%</strong>
            <p><span dir="ltr">{metric.previous_value} → {metric.value} {metric.unit}</span></p>
            <StatusChip label={changeLabel(metric)} tone={Math.abs(metric.change_percent ?? 0) > 5 ? "attention" : "info"} />
          </article>
        ))}
      </div>
      <p className="context-copy">{t("Longitudinal indicators are decision support only and must be interpreted by the physician in clinical context.")}</p>
    </PanelCard>
  );
}

function SourceReferencePanel({ reports, assets }: { reports: DemoReport[]; assets: DemoCaseDetail["sourceAssets"] }) {
  const { t, tv } = useI18n();
  return (
    <PanelCard title="Legacy source reference" subtitle="Reference thumbnails only; structured data is the platform source of truth.">
      <div className="source-reference-grid">
        {assets.map((asset) => (
          <figure key={asset.asset_id}>
            <img src={getAssetUrl(asset)} alt={`${asset.source_pdf} page ${asset.page_number}`} loading="lazy" />
            <figcaption>{tv(asset.module)} · {t("page")} <span dir="ltr">{asset.page_number}</span></figcaption>
          </figure>
        ))}
      </div>
      <div className="tag-list">{reports.map((report) => <span key={report.report_id}>{tv(report.title)} · {tv(report.status)}</span>)}</div>
    </PanelCard>
  );
}

function PercentileWithFlag({ metric }: { metric: DemoQuantitativeMetric }) {
  const { formatNumber } = useI18n();
  if (metric.percentile === null || metric.percentile === undefined) return <>—</>;
  return (
    <div className="percentile-cell">
      <span dir="ltr">{formatNumber(metric.percentile)}</span>
      <PercentileBar value={metric.percentile} />
    </div>
  );
}

function displayPatientName(summary: Pick<DemoCaseSummary, "patient">): string {
  return summary.patient.name_fa || summary.patient.name;
}

function sexLabel(sex: string): string {
  if (sex === "F") return "Female";
  if (sex === "M") return "Male";
  return sex;
}

function formatMetricValue(metric: DemoQuantitativeMetric): string {
  return `${metric.value} ${metric.unit}`;
}

function changeLabel(metric: DemoQuantitativeMetric): string {
  const change = metric.change_percent ?? 0;
  if (Math.abs(change) < 2) return "No major change";
  return change < 0 ? "Lower than previous" : "Higher than previous";
}
