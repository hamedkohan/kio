import { useMemo } from "react";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard, ProgressBar, StatusChip } from "./ui";
import { LongitudinalPanel } from "./DemoReportWorkspace";
import { BrainViewer3D } from "./BrainViewer3D";
import { getDemoCaseDetail, getDemoCaseSummaries, sortMetricsForReview } from "../data/kio-demo/repository";

const LOBES = ["Frontal", "Parietal", "Temporal", "Occipital", "Cingulate"];

// LEAP-inspired lifestyle pillars (educational reference, not a treatment plan).
const PILLARS = [
  { title: "Physical activity", adherence: 72 },
  { title: "Cognitive engagement", adherence: 60 },
  { title: "Sleep", adherence: 81 },
  { title: "Nutrition", adherence: 55 },
  { title: "Vascular health", adherence: 90 },
];

const FOLLOW_UPS = [
  { when: "3 months", focus: "Lifestyle check-in and adherence review", status: "Scheduled" },
  { when: "6 months", focus: "Cognitive reassessment", status: "Planned" },
  { when: "12 months", focus: "Follow-up MRI and longitudinal comparison", status: "Planned" },
];

// Follow-up & longitudinal care: imaging-derived change over time + a brain-health
// lifestyle program + review schedule + research connection.
export function LongitudinalProgram({ caseId }: { caseId?: string }) {
  const { t, formatNumber } = useI18n();
  const summaries = useMemo(() => getDemoCaseSummaries(), []);
  const active = caseId ?? summaries.find((summary) => summary.longitudinal)?.caseRecord.case_id ?? summaries[0]?.caseRecord.case_id ?? "";
  const detail = getDemoCaseDetail(active);

  if (!detail) {
    return <EmptyState title={t("No case selected")} message={t("Select an imported case to view longitudinal monitoring.")} />;
  }

  const longitudinalAll = detail.metrics.filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined);
  const longRows = sortMetricsForReview(longitudinalAll).slice(0, 8);
  const isLongitudinal = longRows.length > 0;
  const hasRegionalMap = detail.metrics.some((metric) => LOBES.includes(metric.structure) && metric.hemisphere === "total" && metric.percentile !== null && metric.percentile !== undefined);
  const brainUrl = `${import.meta.env.BASE_URL}demo-data/mesh/brain-${detail.caseRecord.case_id}.ply`;

  return (
    <>
      <PanelCard title="Longitudinal monitoring" subtitle="Imaging-derived change across timepoints">
        {isLongitudinal ? (
          <div className="status-list">
            <div><span>{t("Current study")}</span><strong dir="ltr">{longRows[0].study_date ?? detail.caseRecord.study_date}</strong></div>
            <div><span>{t("Previous study")}</span><strong dir="ltr">{longRows[0].comparison_study_date ?? "—"}</strong></div>
            <div><span>{t("Tracked structures")}</span><strong>{formatNumber(longitudinalAll.length)}</strong></div>
          </div>
        ) : (
          <EmptyState title={t("Single timepoint")} message={t("This case has one timepoint; longitudinal comparison appears after a follow-up scan.")} />
        )}
      </PanelCard>
      {isLongitudinal ? <LongitudinalPanel metrics={longRows} /> : null}
      <BrainViewer3D key={brainUrl} meshUrl={brainUrl} hasRegionalMap={hasRegionalMap} title="Atrophy over time" subtitle="Rotatable cortical surface for the selected case · drag to rotate, scroll to zoom" />

      <PanelCard title="Brain health program (LEAP-inspired)" subtitle="Lifestyle empowerment for prevention — educational, not a treatment plan">
        <div className="program-pillars">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="program-pillar">
              <div className="program-pillar-head"><strong>{t(pillar.title)}</strong><span dir="ltr">{pillar.adherence}%</span></div>
              <ProgressBar value={pillar.adherence} label={t(pillar.title)} />
            </div>
          ))}
        </div>
        <div className="safe-note"><strong>{t("Educational program")}</strong><p>{t("Lifestyle guidance is general brain-health education inspired by prevention programs and is coordinated with the care team. It is not a treatment recommendation.")}</p></div>
      </PanelCard>

      <PanelCard title="Follow-up schedule" subtitle="Physician-defined review points coordinated by Operations">
        <div className="followup-schedule">
          {FOLLOW_UPS.map((followUp) => (
            <article key={followUp.when}>
              <span>{t(followUp.when)}</span>
              <strong>{t(followUp.focus)}</strong>
              <StatusChip label={followUp.status} tone={/scheduled/i.test(followUp.status) ? "good" : "info"} />
            </article>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Research connection" subtitle="Longitudinal data can support research only after consent">
        <div className="status-list">
          <div><span>{t("Research eligibility")}</span><StatusChip label="Eligible after consent" /></div>
          <div><span>{t("Data sharing")}</span><StatusChip label="De-identified only" tone="good" /></div>
          <div><span>{t("Longitudinal cohort")}</span><StatusChip label="Optional participation" /></div>
        </div>
      </PanelCard>
    </>
  );
}
