import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard } from "./ui";
import { LongitudinalPanel, QuantitativeMetricsPanel } from "./DemoReportWorkspace";
import { CentileCurvesSection } from "./CentileCurves";
import { BrainViewer3D } from "./BrainViewer3D";
import { getDemoCaseDetail, getDemoCaseSummaries, getKeyMetrics, sortMetricsForReview } from "../data/kio-demo/repository";

const LOBES = ["Frontal", "Parietal", "Temporal", "Occipital", "Cingulate"];

// Shared, case-driven imaging evidence (3D atrophy brain + centile curves + quantitative).
// Used by both the Radiologist review and the Physician interpretation workspaces.
export function ImagingEvidence({ caseId }: { caseId?: string }) {
  const { t } = useI18n();
  const summaries = useMemo(() => getDemoCaseSummaries(), []);
  const [selected, setSelected] = useState(caseId ?? summaries[0]?.caseRecord.case_id ?? "");
  const detail = getDemoCaseDetail(selected) ?? (summaries[0] ? getDemoCaseDetail(summaries[0].caseRecord.case_id) : undefined);

  if (!detail) {
    return <EmptyState title={t("No imaging evidence")} message={t("No imported imaging case is available.")} />;
  }

  const corticometry = detail.metrics.filter((metric) => metric.domain === "corticometry");
  const longitudinalRows = sortMetricsForReview(detail.metrics.filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined)).slice(0, 8);
  const hasRegionalMap = detail.metrics.some((metric) => LOBES.includes(metric.structure) && metric.hemisphere === "total" && metric.percentile !== null && metric.percentile !== undefined);
  const brainUrl = `${import.meta.env.BASE_URL}demo-data/mesh/brain-${detail.caseRecord.case_id}.ply`;

  return (
    <>
      <PanelCard
        title="Imaging evidence (imported case)"
        subtitle="Radiologist-reviewed quantitative imaging evidence, presented for clinical interpretation"
        action={
          <select className="rccb-select" aria-label={t("Imaging case")} value={selected} onChange={(event) => setSelected(event.target.value)}>
            {summaries.map((summary) => (
              <option key={summary.caseRecord.case_id} value={summary.caseRecord.case_id}>
                {summary.patient.name_fa || summary.patient.name} · {summary.caseRecord.case_id} · {summary.caseRecord.primary_module}
              </option>
            ))}
          </select>
        }
      >
        <div className="ai-boundary"><strong>{t("Decision support only")}</strong><p>{t("Reviewed imaging evidence supports physician interpretation; it is not a final diagnosis.")}</p></div>
      </PanelCard>
      <BrainViewer3D key={brainUrl} meshUrl={brainUrl} hasRegionalMap={hasRegionalMap} title="3D atrophy brain" subtitle="Rotatable cortical surface — coloured by the selected case · drag to rotate, scroll to zoom" />
      {corticometry.length ? <CentileCurvesSection corticometryMetrics={corticometry} patientAge={detail.patient.age_at_study} /> : null}
      {longitudinalRows.length ? <LongitudinalPanel metrics={longitudinalRows} /> : null}
      <QuantitativeMetricsPanel metrics={getKeyMetrics(detail.metrics)} title="Key quantitative biomarkers" showProgressiveDisclosure />
    </>
  );
}
