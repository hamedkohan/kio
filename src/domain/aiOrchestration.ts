import type { CasePhase } from "./caseState";
import { AI_MODULES, type AiModule } from "../data/integrations";
import type { ImagingAnalysisResponse } from "../api/imagingAnalysis";

// ── AI orchestration runtime ──────────────────────────────────────────────────
// AI is a registry of pluggable modules (src/data/integrations.ts). This layer
// *executes* them: active modules run a handler over the case analysis; planned
// modules are registry slots that are skipped until enabled. Each module can gate
// downstream modules (e.g. validation must pass before risk scoring). Handlers
// here are deterministic mocks derived from real analysis data — a real pipeline
// swaps the handler body without changing the orchestration contract.

export type ModuleRunStatus = "succeeded" | "skipped" | "blocked" | "failed";

export type ModuleRunResult = {
  moduleId: string;
  name: string;
  capability: string;
  phase: CasePhase;
  status: ModuleRunStatus;
  summary: string;
  outputs: Array<{ label: string; value: string }>;
  durationMs: number;
};

export type OrchestrationRun = {
  caseId: string;
  startedAt: string;
  results: ModuleRunResult[];
  succeeded: number;
  skipped: number;
  blocked: number;
};

type HandlerContext = { analysis: ImagingAnalysisResponse; priorResults: ModuleRunResult[] };
type HandlerOutput = { summary: string; outputs: Array<{ label: string; value: string }> };
type ModuleHandler = (ctx: HandlerContext) => HandlerOutput;

const fmtPct = (p: number) => `P${Math.round(p)}`;

// Executable handlers for the *active* modules. Planned modules have no handler
// and are reported as skipped registry slots.
const HANDLERS: Record<string, ModuleHandler> = {
  morphometry: ({ analysis }) => {
    const regions = analysis.regions;
    const lowest = [...regions].sort((a, b) => a.percentile - b.percentile)[0];
    return {
      summary: `Computed regional volumetry and normative percentiles for ${regions.length} Desikan-Killiany regions.`,
      outputs: [
        { label: "Regions analysed", value: String(regions.length) },
        { label: "Lowest region", value: lowest ? `${lowest.region} (${fmtPct(lowest.percentile)})` : "—" },
        { label: "Parcellation", value: analysis.mesh.parcellation },
      ],
    };
  },
  "ai-qc": ({ analysis }) => {
    const flagged = analysis.regions.filter((r) => r.flagged).length;
    return {
      summary: `Quality checks passed; ${flagged} region(s) flagged for clinician attention.`,
      outputs: [
        { label: "QC status", value: analysis.qc.status },
        { label: "Motion", value: analysis.qc.motion ?? "—" },
        { label: "Flagged regions", value: String(flagged) },
      ],
    };
  },
};

// Run order follows the journey phase ordering of the modules' registry entries.
const PHASE_RANK: CasePhase[] = [
  "case_initiation", "mri_intake", "imaging_readiness", "ai_processing",
  "ai_validation", "radiologist_review", "physician_review", "publication",
  "follow_up_closure", "research",
];

function orderModules(modules: AiModule[]): AiModule[] {
  return [...modules].sort((a, b) => PHASE_RANK.indexOf(a.phase) - PHASE_RANK.indexOf(b.phase));
}

// Validation gates everything after the ai_validation phase: if the QC module did
// not succeed, downstream active modules are reported as blocked.
function isGatedOut(module: AiModule, priorResults: ModuleRunResult[]): boolean {
  const validation = priorResults.find((r) => r.moduleId === "ai-qc");
  const afterValidation = PHASE_RANK.indexOf(module.phase) > PHASE_RANK.indexOf("ai_validation");
  return afterValidation && !!validation && validation.status !== "succeeded";
}

export function orchestrateCase(analysis: ImagingAnalysisResponse, modules: AiModule[] = AI_MODULES): OrchestrationRun {
  const results: ModuleRunResult[] = [];
  for (const module of orderModules(modules)) {
    const base = { moduleId: module.id, name: module.name, capability: module.capability, phase: module.phase };
    if (module.status !== "active") {
      results.push({ ...base, status: "skipped", summary: "Registry slot — not enabled in this deployment.", outputs: [], durationMs: 0 });
      continue;
    }
    if (isGatedOut(module, results)) {
      results.push({ ...base, status: "blocked", summary: "Blocked: AI validation did not pass.", outputs: [], durationMs: 0 });
      continue;
    }
    const handler = HANDLERS[module.id];
    if (!handler) {
      results.push({ ...base, status: "skipped", summary: "No handler registered.", outputs: [], durationMs: 0 });
      continue;
    }
    const { summary, outputs } = handler({ analysis, priorResults: results });
    // Deterministic mock duration so the run log reads like a real pipeline.
    const durationMs = 120 + outputs.length * 40 + module.id.length * 8;
    results.push({ ...base, status: "succeeded", summary, outputs, durationMs });
  }
  return {
    caseId: analysis.case_id,
    startedAt: new Date().toISOString(),
    results,
    succeeded: results.filter((r) => r.status === "succeeded").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    blocked: results.filter((r) => r.status === "blocked").length,
  };
}
