import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard, StatusChip } from "./ui";
import { dkRegionLabel } from "../api/dkRegions";
import { useImagingAnalysis } from "../api/imagingAnalysis";
import { orchestrateCase, type OrchestrationRun, type ModuleRunStatus, type ModuleRunResult } from "../domain/aiOrchestration";
import { PHASE_LABELS } from "./CaseJourney";

// An operational case whose MRI has been processed, so the AI registry can run
// over its imaging analysis. `analysisId` resolves the bundled analysis contract.
export type RuntimeCase = { caseId: string; label: string; analysisId: string };

// How long the AI pipeline visibly runs. The computation itself is instant — this
// is a deliberate, staged processing experience for the paid analysis step, so it
// reads like real imaging work is happening. Raise later (e.g. 30_000–60_000) to
// mirror true pipeline latency; everything else adapts automatically.
const PROCESSING_DURATION_MS = 15000;

// Cosmetic imaging-pipeline stages shown before the real module results, so the
// run reads like an MRI actually going through morphometry. These represent the
// NeuroTrack pipeline producing the analysis the active modules then consume.
const PREP_STAGES = [
  "Ingesting MRI study",
  "Preprocessing · bias-field correction",
  "Cortical surface reconstruction",
  "Desikan–Killiany parcellation",
  "Regional volumetry & normative percentiles",
];

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

type RunPhase = "idle" | "running" | "done";
type Stage = { key: string; label: string; result?: ModuleRunResult };

// Runtime that executes the AI module registry over an OPERATIONAL case's imaging
// analysis, showing a per-module run log. Active modules run; planned modules are
// skipped registry slots; validation gates downstream modules. The run is revealed
// as a staged, timed pipeline so the paid analysis step feels like real work.
export function AiOrchestrationPanel({ cases }: { cases: RuntimeCase[] }) {
  const { t, tv, formatNumber } = useI18n();
  const [caseId, setCaseId] = useState(cases[0]?.caseId ?? "");
  const selectedCase = cases.find((entry) => entry.caseId === caseId) ?? cases[0];
  const { analysis, loading } = useImagingAnalysis(selectedCase?.analysisId);
  const [run, setRun] = useState<OrchestrationRun | null>(null);
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [progress, setProgress] = useState(0); // 0 … 1
  const [elapsed, setElapsed] = useState(0); // ms

  // Drive the staged progress while running, off real wall-clock time.
  useEffect(() => {
    if (phase !== "running") return;
    const start = Date.now();
    let timer = 0;
    const tick = () => {
      const ms = Date.now() - start;
      const ratio = Math.min(1, ms / PROCESSING_DURATION_MS);
      setElapsed(ms);
      setProgress(ratio);
      if (ratio < 1) timer = window.setTimeout(tick, 80);
      else setPhase("done");
    };
    timer = window.setTimeout(tick, 80);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const startRun = () => {
    if (!analysis) return;
    setRun(orchestrateCase(analysis)); // real orchestration; revealed over time below
    setProgress(0);
    setElapsed(0);
    setPhase("running");
  };

  const resetFor = (nextCaseId: string) => {
    setCaseId(nextCaseId);
    setRun(null);
    setPhase("idle");
    setProgress(0);
    setElapsed(0);
  };

  const humanize = (value: string) => {
    // Make DK region machine-names in outputs readable.
    const match = value.match(/^([a-z]+) \((P\d+)\)$/);
    if (match) return `${t(dkRegionLabel(match[1]))} (${match[2]})`;
    return value;
  };

  if (!cases.length) {
    return (
      <PanelCard title="AI orchestration runtime" subtitle="Execute the registry over a case · active modules run, planned modules are skipped, validation gates downstream">
        <EmptyState title={t("No case ready to run")} message={t("The AI registry runs over operational cases whose MRI has been processed. None are ready right now.")} />
      </PanelCard>
    );
  }

  // Full stage timeline: cosmetic prep stages, then the real module results.
  const stages: Stage[] = run
    ? [
        ...PREP_STAGES.map((label, index) => ({ key: `prep-${index}`, label })),
        ...run.results.map((result) => ({ key: result.moduleId, label: result.name, result })),
      ]
    : [];
  const revealed = Math.floor(progress * stages.length);
  const runButtonLabel = phase === "running"
    ? t("Analyzing…")
    : loading
      ? t("Loading analysis…")
      : phase === "done"
        ? t("Run again")
        : t("Run AI pipeline");

  return (
    <PanelCard
      title="AI orchestration runtime"
      subtitle="Execute the registry over an operational case with a processed MRI · active modules run, planned modules are skipped, validation gates downstream"
      action={
        <div className="button-row">
          <select className="rccb-select" aria-label={t("Imaging case")} value={caseId} onChange={(event) => resetFor(event.target.value)} disabled={phase === "running"}>
            {cases.map((entry) => (
              <option key={entry.caseId} value={entry.caseId}>{entry.label}</option>
            ))}
          </select>
          <button type="button" className="primary-button" disabled={!analysis || loading || phase === "running"} onClick={startRun}>
            {runButtonLabel}
          </button>
        </div>
      }
    >
      {phase === "idle" ? (
        <EmptyState title={t("No run yet")} message={analysis ? t("Run the AI pipeline to execute the module registry for this case.") : t("No imaging analysis is available for this case.")} />
      ) : phase === "running" ? (
        <div className="ai-processing">
          <div className="ai-processing-head">
            <span className="ai-spinner" aria-hidden="true" />
            <div className="ai-processing-title">
              <strong>{t("Analyzing MRI study…")}</strong>
              <span>{t("Running AI morphometry and quality validation")}</span>
            </div>
            <div className="ai-processing-pct" aria-live="polite">{formatNumber(Math.round(progress * 100))}%</div>
          </div>
          <div className="ai-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="ai-progress-bar" style={{ inlineSize: `${progress * 100}%` }} />
          </div>
          <div className="ai-processing-meta">
            <span>{t("Elapsed")} {formatNumber(Math.floor(elapsed / 1000))}s</span>
            <span>{formatNumber(Math.min(revealed, stages.length))}/{formatNumber(stages.length)} {t("steps")}</span>
          </div>
          <ol className="ai-stage-list">
            {stages.map((stage, index) => {
              const state = index < revealed ? "done" : index === revealed ? "active" : "pending";
              return (
                <li key={stage.key} className={`ai-stage ai-stage-${state}`}>
                  <span className="ai-stage-dot" aria-hidden="true" />
                  <span className="ai-stage-label">{tv(stage.label)}</span>
                  {state === "active" ? <span className="ai-stage-status">{t("Processing…")}</span> : null}
                  {state === "done" ? <span className="ai-stage-status">{t("Done")}</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : run ? (
        <>
          <div className="status-list">
            <div><span>{t("Case")}</span><strong>{tv(selectedCase?.label ?? run.caseId)}</strong></div>
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
                      <span key={output.label}><em>{t(output.label)}</em>{humanize(output.value)}</span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="safe-note"><strong>{t("AI orchestration")}</strong><p>{t("Active modules run in this deployment. Planned modules are registry slots that can be enabled without changing the journey. AI output is decision support and is always validated by a clinician before release.")}</p></div>
        </>
      ) : null}
    </PanelCard>
  );
}
