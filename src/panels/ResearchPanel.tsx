import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, EvidenceLayerTabs, EvidenceSection, MetricCard, PageHeader, PanelCard, ReportReadinessChecklist, StatusChip, WorkflowReadinessPanel, WorkspaceHero } from "../components/ui";
import { DemoReportWorkspace } from "../components/DemoReportWorkspace";
import type { ResearchSafeCaseView } from "../selectors/visibility";

type Props = { cases: ResearchSafeCaseView[]; activeView: string; onAction: (action: string) => void };

export const researchNav = [
  { id: "cohort", label: "Cohort Builder" },
  { id: "dataset", label: "Case Dataset" },
  { id: "filters", label: "Filters" },
  { id: "longitudinal", label: "Longitudinal Analysis" },
  { id: "export", label: "Export" },
];

export function ResearchPanel({ cases, activeView, onAction }: Props) {
  const { t, tv, formatNumber } = useI18n();
  const researchCases = cases.filter((item) => item.researchCaseId !== "restricted" && item.anonymizationStatus === "Anonymized");
  const [sex, setSex] = useState("All");
  const [longitudinal, setLongitudinal] = useState(false);
  const [ageGroup, setAgeGroup] = useState("All");
  const filtered = useMemo(() => researchCases.filter((item) => (sex === "All" || item.sex === sex) && (!longitudinal || item.longitudinal) && (ageGroup === "All" || item.ageBand === ageGroup)), [researchCases, sex, longitudinal, ageGroup]);
  const narrowCohort = filtered.length > 0 && filtered.length < 2;
  const exportBlocked = filtered.length === 0 || narrowCohort;

  const datasetTable = (items: ResearchSafeCaseView[]) => (
    <div className="table-wrap"><table><thead><tr><th>{t("Anonymized case")}</th><th>{t("Relative timepoint")}</th><th>{t("Timepoints")}</th><th>{t("Metric availability")}</th><th>{t("Quality")}</th><th>{t("Export")}</th></tr></thead><tbody>{items.map((item) => <tr key={item.researchCaseId}><td><ResearchIdentity item={item} /></td><td>{tv(item.relativeTimepoint)}</td><td className="bidi-isolate">{item.timepointCount}</td><td><StatusChip label={item.metricAvailability} /></td><td><StatusChip label={item.highLevelQcStatus} /></td><td><StatusChip label={item.eligibilityStatus} /></td></tr>)}</tbody></table></div>
  );

  if (activeView === "dataset") return (
    <>
      <PageHeader eyebrow="Anonymized dataset" title="Case Dataset" description="Case-level research data without patient identity or live-care actions." />
      <div className="metric-grid"><MetricCard label="Dataset version" value="v0.4" detail="Immutable dataset snapshot" tone="info" /><MetricCard label="Withdrawal handling" value="Tracked" detail="Future use blocked if consent changes" /><MetricCard label="Exact dates" value="Hidden" detail="Relative timepoints only" tone="good" /><MetricCard label="Live care access" value="None" detail="Research cannot route cases" tone="good" /></div>
      <PanelCard title={`${formatNumber(researchCases.length)} ${t("anonymized cases")}`} subtitle="Only consented and research-appropriate fields are visible">{datasetTable(researchCases)}</PanelCard>
    </>
  );

  if (activeView === "filters") return (
    <>
      <PageHeader eyebrow="Approved variables" title="Filters" description="Use only approved research variables and avoid overly narrow combinations." />
      <PanelCard title="Cohort filters"><FilterControls sex={sex} setSex={setSex} ageGroup={ageGroup} setAgeGroup={setAgeGroup} longitudinal={longitudinal} setLongitudinal={setLongitudinal} /><div className={`filter-result ${narrowCohort ? "risk" : ""}`}><strong>{t("{count} cases match", { count: formatNumber(filtered.length) })}</strong><span>{narrowCohort ? t("Narrow cohort: re-identification review needed before export") : t("Consent and anonymization checks passed")}</span></div></PanelCard>
      <PanelCard title="Filtered dataset">{filtered.length ? datasetTable(filtered) : <EmptyState title="No cases match these filters" message="Broaden the criteria to maintain a research-safe cohort." />}</PanelCard>
    </>
  );

  if (activeView === "longitudinal") {
    const longitudinalCases = researchCases.filter((item) => item.longitudinal);
    return (
      <>
        <PageHeader eyebrow="Research-only analysis" title="Longitudinal Analysis" description="Explore anonymized timepoint metrics without interpreting patient-specific clinical progression." />
        {longitudinalCases.length ? longitudinalCases.map((item) => <PanelCard key={item.researchCaseId} title={`${item.researchCaseId} · ${t("two timepoints")}`} subtitle="Comparable studies · relative interval 12 months"><div className="longitudinal-grid"><div><span>{t("Metric availability")}</span><strong>{tv(item.metricAvailability)}</strong><div className="trend-line small"><span /><span /><span /><span /></div><small>{t("Research-safe view hides direct values by design.")}</small></div><div><span>{t("Quality")}</span><strong>{tv(item.highLevelQcStatus)}</strong><div className="trend-line small"><span /><span /><span /><span /></div><small>{t("High-level QC only")}</small></div></div></PanelCard>) : <EmptyState title="No longitudinal data" message="No approved multiple-timepoint records are available." />}
      </>
    );
  }

  if (activeView === "export") return (
    <>
      <PageHeader eyebrow="Governed output" title="Export" description="Prepare an anonymized research export after consent, field, and risk checks." />
      <div className="split-layout"><PanelCard title="Export readiness"><div className="status-list"><div><span>{t("Selected cohort")}</span><StatusChip label={`${formatNumber(filtered.length)} ${t("cases")}`} /></div><div><span>{t("Consent coverage")}</span><StatusChip label={filtered.every((item) => item.consentStatus === "Consented") ? "Complete" : "Blocked"} /></div><div><span>{t("Anonymization")}</span><StatusChip label={filtered.every((item) => item.anonymizationStatus === "Anonymized") ? "Complete" : "Blocked"} /></div><div><span>{t("Re-identification risk")}</span><StatusChip label={exportBlocked ? "Review required" : "Low after field check"} /></div><div><span>{t("Export version")}</span><StatusChip label={exportBlocked ? "Draft blocked" : "Draft v0.1"} /></div></div>{exportBlocked ? <div className="prototype-note"><strong>{t("Export not ready")}</strong><p>{t("Broaden the cohort or remove risky filters before preparing an anonymized export.")}</p></div> : null}</PanelCard><PanelCard title="Selected fields"><div className="tag-list"><span>{t("Anonymized case ID")}</span><span>{t("Age group")}</span><span>{t("Sex")}</span><span>{t("Relative timepoint")}</span><span>{t("Metric availability")}</span><span>{t("Quality flags")}</span></div><button className="primary-button" disabled={exportBlocked} onClick={() => onAction("export")}>{t("Generate CSV placeholder")}</button></PanelCard></div>
      <PanelCard title="Blocked export example" subtitle="Governance placeholder, not a backend rule engine">
        <div className="status-list"><div><span>{t("Example blocker")}</span><StatusChip label="Consent withdrawal impact" /></div><div><span>{t("Export action")}</span><StatusChip label="Blocked until cohort updated" /></div><div><span>{t("Resolution")}</span><StatusChip label="Remove withdrawn records" /></div></div>
      </PanelCard>
      <div className="safe-note"><strong>{t("Restricted by default")}</strong><p>{t("Patient name, contact information, full date of birth, identifiable DICOM metadata, private notes, and patient-facing reports are excluded.")}</p></div>
    </>
  );

  return (
    <>
      <WorkspaceHero
        eyebrow="Research Workspace"
        title="Build a governed de-identified cohort"
        description="Inspect consent, anonymization, relative timepoints, high-level QC, and availability without live-care access or direct identifiers."
        stats={[
          { label: "Research-eligible", value: researchCases.length, detail: "Consented and anonymized cases", tone: "good" },
          { label: "Longitudinal", value: researchCases.filter((item) => item.longitudinal).length, detail: "Multiple approved timepoints", tone: "info" },
          { label: "Quality flagged", value: researchCases.filter((item) => item.highLevelQcStatus !== "Acceptable").length, detail: "Review before analysis", tone: "attention" },
          { label: "Export readiness", value: exportBlocked ? "Review" : "Ready", detail: "For approved fields only", tone: exportBlocked ? "attention" : "good" },
        ]}
      />
      <div className="split-layout"><PanelCard title="Cohort criteria" subtitle="Approved variables only"><FilterControls sex={sex} setSex={setSex} ageGroup={ageGroup} setAgeGroup={setAgeGroup} longitudinal={longitudinal} setLongitudinal={setLongitudinal} /><div className={`filter-result ${narrowCohort ? "risk" : ""}`}><strong>{t("{count} cases match", { count: formatNumber(filtered.length) })}</strong><span>{narrowCohort ? t("Narrow cohort: review re-identification risk before export") : t("Patient identity remains hidden")}</span></div></PanelCard><PanelCard title="Consent and anonymization scope"><WorkflowReadinessPanel items={[
        { label: "Consent scope", status: "Metrics and approved labels" },
        { label: "Anonymization method", status: "Age band + relative timepoint" },
        { label: "Withdrawal handling", status: "Future use blocked if withdrawn" },
        { label: "Dataset version", status: "Dataset v0.4" },
        { label: "Exact dates", status: "Hidden by default" },
        { label: "Live care actions", status: "No access" },
      ]} /></PanelCard></div>
      <EvidenceSection title="Report-to-dataset availability" description="Research sees governed availability signals, not clinical report text or patient release packages." eyebrow="De-identified report workspace">
        <EvidenceLayerTabs layers={[
          { label: "Volumetry availability", status: filtered.length ? "Available as flags" : "No cohort", detail: "No raw patient report", tone: filtered.length ? "good" : "attention" },
          { label: "Corticometry availability", status: "Availability only", detail: "No identifiable report content", tone: "info" },
          { label: "Structured MRI report", status: "Restricted", detail: "No clinical free text", tone: "attention" },
          { label: "Patient-safe release", status: "Not available", detail: "Not research data", tone: "neutral" },
        ]} />
        <ReportReadinessChecklist title="Governed dataset readiness" items={[
          { label: "Consent and anonymization", status: filtered.every((item) => item.consentStatus === "Consented" && item.anonymizationStatus === "Anonymized") ? "Complete" : "Review required" },
          { label: "Direct identifiers", status: "Hidden", detail: "No name, contact, or exact date fields" },
          { label: "Clinical report text", status: "Restricted", detail: "Governance not active in this PR" },
          { label: "Patient release packages", status: "Not available", detail: "Patient-facing content is outside research view" },
          { label: "Export package", status: exportBlocked ? "Blocked" : "Draft ready", detail: "Placeholder only" },
        ]} />
      </EvidenceSection>
      <DemoReportWorkspace role="research" title="Imported Kio report data as governed research availability" />
      <PanelCard title="Cohort preview">{datasetTable(filtered)}</PanelCard>
    </>
  );
}

function FilterControls({ sex, setSex, ageGroup, setAgeGroup, longitudinal, setLongitudinal }: { sex: string; setSex: (value: string) => void; ageGroup: string; setAgeGroup: (value: string) => void; longitudinal: boolean; setLongitudinal: (value: boolean) => void }) {
  const { t } = useI18n();
  return <div className="filter-grid"><label>{t("Sex")}<select value={sex} onChange={(event) => setSex(event.target.value)}><option value="All">{t("All")}</option><option value="Female">{t("Female")}</option><option value="Male">{t("Male")}</option></select></label><label>{t("Age group")}<select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}><option value="All">{t("All")}</option><option value="60–64">60–64</option><option value="65–69">65–69</option><option value="70–74">70–74</option></select></label><label className="check-label"><input type="checkbox" checked={longitudinal} onChange={(event) => setLongitudinal(event.target.checked)} /> {t("Longitudinal only")}</label></div>;
}

function ResearchIdentity({ item }: { item: ResearchSafeCaseView }) {
  const { tv } = useI18n();
  return (
    <div className="case-identity">
      <span className="avatar avatar-anonymized" dir="ltr">{item.researchCaseId.slice(-2)}</span>
      <div>
        <strong dir="ltr">{item.researchCaseId}</strong>
        <p><span dir="ltr">{item.ageBand}</span> · {item.sex ? tv(item.sex) : tv("Restricted")}</p>
      </div>
    </div>
  );
}
