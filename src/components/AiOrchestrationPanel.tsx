import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard, StatusChip } from "./ui";
import { dkRegionLabel } from "../api/dkRegions";
import { useImagingAnalysis } from "../api/imagingAnalysis";
import { orchestrateCase, type OrchestrationRun, type ModuleRunStatus } from "../domain/aiOrchestration";
import { getDemoCaseSummaries } from "../data/kio-demo/repository";
import { PHASE_LABELS } from "./CaseJourney";

const STATUS_TONE: Record<ModuleRunStatus, string> = {
  succeeded: "ready",
  skipped: "neutral",
  blocked: "attention",
  failed: "attention",
};
const STATUS_LABEL: Record<ModuleRunStatus, string> = {
  succeeded: "Succeeded",
  skipped: "Skipped",
  blocked: "Blocked",
  failed: "Failed",
};

// Runtime that executes the AI module registry over a case's imaging analysis,
// showing a per-module run log. Active modules run; planned modules are skipped
// registry slots; validation gates downstream modules.
export function AiOrchestrationPanel() {
  const { t, tv, formatNumber } = useI18n();
  const summaries = useMemo(() => getDemoCaseSummaries(), []);
  const [caseId, setCaseId] = useState(summaries.find((s) => s.longitudinal)?.caseRecord.case_id ?? summaries[0]?.caseRecord.case_id ?? "");
  const { analysis, loading } = useImagingAnalysis(caseId);
  const [run, setRun] = useState<OrchestrationRun | null>(null);

  const humanize = (summary: string, value: string) => {
    // Make DK region machine-names in outputs readable.
    const match = value.match(/^([a-z]+) \((P\d+)\)$/);
    if (match) return `${t(dkRegionLabel(match[1]))} (${match[2]})`;
    return value;
  };

  return (
    <PanelCard
      title="AI orchestration runtime"
      subtitle="Execute the registry over a case · active modules run, planned modules are skipped, validation gates downstream"
      action={
        <div className="button-row">
          <select className="rccb-select" aria-label={t("Imaging case")} value={caseId} onChange={(event) => { setCaseId(event.target.value); setRun(null); }}>
            {summaries.map((summary) => (
              <option key={summary.caseRecord.case_id} value={summary.caseRecord.case_id}>
                {(summary.patient.name_fa || summary.patient.name)} · {summary.caseRecord.case_id}
              </option>
            ))}
          </select>
          <button type="button" className="primary-button" disabled={!analysis || loading} onClick={() => analysis && setRun(orchestrateCase(analysis))}>
            {t("Run AI pipeline")}
          </button>
        </div>
      }
    >
      {!run ? (
        <EmptyState title={t("No run yet")} message={analysis ? t("Run the AI pipeline to execute the module registry for this case.") : t("No imaging analysis is available for this case.")} />
      ) : (
        <>
          <div className="status-list">
            <div><span>{t("Case")}</span><strong dir="ltr">{run.caseId}</strong></div>
            <div><span>{t("Succeeded")}</span><strong>{formatNumber(run.succeeded)}</strong></div>
            <div><span>{t("Skipped")}</span><strong>{formatNumber(run.skipped)}</strong></div>
            {run.blocked ? <div><span>{t("Blocked")}</span><strong>{formatNumber(run.blocked)}</strong></div> : null}
          </div>
          <ol className="ai-run-log">
            {run.results.map((result) => (
              <li key={result.moduleId} className={`ai-run-item ai-run-${result.status}`}>
                <div className="ai-run-head">
                  <div>
                    <strong>{tv(result.name)}</strong>
                    <span className="ai-run-meta">{t(result.capability)} · {t(PHASE_LABELS[result.phase])}{result.durationMs ? ` · ${formatNumber(result.durationMs)}ms` : ""}</span>
                  </div>
                  <StatusChip label={STATUS_LABEL[result.status]} tone={STATUS_TONE[result.status]} />
                </div>
                <p>{t(result.summary)}</p>
                {result.outputs.length ? (
                  <div className="ai-run-outputs">
                    {result.outputs.map((output) => (
                      <span key={output.label}><em>{t(output.label)}</em>{humanize(result.summary, output.value)}</span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="safe-note"><strong>{t("AI orchestration")}</strong><p>{t("Active modules run in this deployment. Planned modules are registry slots that can be enabled without changing the journey. AI output is decision support and is always validated by a clinician before release.")}</p></div>
        </>
      )}
    </PanelCard>
  );
}
