import type { CasePhase } from "../domain/caseState";

// Connection maturity for an external integration surface.
// connected = live wiring; mock = contract designed, returning demo data; planned = not yet built.
export type IntegrationStatus = "connected" | "mock" | "planned";

export type IntegrationCategory = "Imaging" | "Assessment" | "Longevity" | "AI" | "Research";

export type Integration = {
  id: string;
  name: string;
  category: IntegrationCategory;
  // The journey phase at which this integration becomes relevant.
  phase: CasePhase;
  status: IntegrationStatus;
  description: string;
  // What is exchanged with Kio at this step.
  exchanges: string;
};

// External services that plug into the case journey. Shown as status cards in Operations,
// anchored to the lifecycle phase where each one engages.
export const INTEGRATIONS: Integration[] = [
  {
    id: "bhap",
    name: "BHAP · Brain Health Assessment",
    category: "Assessment",
    phase: "case_initiation",
    status: "planned",
    description: "Risk-assessment intake that seeds the case with structured cognitive and lifestyle inputs.",
    exchanges: "Risk questionnaire in · assessment summary out",
  },
  {
    id: "mri-pacs",
    name: "MRI / PACS imaging source",
    category: "Imaging",
    phase: "mri_intake",
    status: "mock",
    description: "Receives the requested MRI study from the imaging provider or hospital PACS.",
    exchanges: "DICOM study in · receipt + QC status out",
  },
  {
    id: "neurotrack",
    name: "NeuroTrack imaging pipeline",
    category: "Imaging",
    phase: "ai_processing",
    status: "mock",
    description: "Automated morphometry pipeline: request → receive → process → structured output ready.",
    exchanges: "Study in · structured biomarker JSON out",
  },
  {
    id: "ai-services",
    name: "AI analysis services",
    category: "AI",
    phase: "ai_validation",
    status: "mock",
    description: "Quantitative biomarker, percentile, and QC outputs validated before clinical review.",
    exchanges: "Volumetrics + centiles in · validated metrics out",
  },
  {
    id: "bhlp",
    name: "BHLP · Brain Health Longevity Program",
    category: "Longevity",
    phase: "follow_up_closure",
    status: "planned",
    description: "Lifestyle program enrollment and adherence tracking for longitudinal follow-up.",
    exchanges: "Enrollment out · adherence + progress in",
  },
  {
    id: "research-export",
    name: "Research data services",
    category: "Research",
    phase: "research",
    status: "planned",
    description: "De-identified dataset export available only after research consent is recorded.",
    exchanges: "Consented de-identified dataset out",
  },
];

// Lifecycle of an AI capability within the platform.
export type AiModuleStatus = "active" | "validation" | "planned";

export type AiModule = {
  id: string;
  name: string;
  capability: string;
  phase: CasePhase;
  status: AiModuleStatus;
  version: string;
  description: string;
};

// AI orchestration as a registry of pluggable modules rather than one hard-wired pipeline.
// Imaging morphometry is live in the demo; the rest are slots on the same registry.
export const AI_MODULES: AiModule[] = [
  {
    id: "morphometry",
    name: "Imaging morphometry & centiles",
    capability: "Imaging analysis",
    phase: "ai_processing",
    status: "active",
    version: "v1.0",
    description: "Regional volumetrics and normative percentile placement from the MRI study.",
  },
  {
    id: "ai-qc",
    name: "Quantitative QC & validation",
    capability: "AI quality assurance",
    phase: "ai_validation",
    status: "active",
    version: "v1.0",
    description: "Confidence and quality flags that gate metrics before radiologist review.",
  },
  {
    id: "risk-scoring",
    name: "Risk stratification",
    capability: "Risk scoring",
    phase: "physician_review",
    status: "planned",
    version: "—",
    description: "Composite risk score combining imaging biomarkers with assessment inputs.",
  },
  {
    id: "report-assist",
    name: "Report drafting assist",
    capability: "Report assist",
    phase: "publication",
    status: "planned",
    version: "—",
    description: "Drafts clinician and patient-safe report language for human review and approval.",
  },
  {
    id: "followup-rec",
    name: "Follow-up recommendation",
    capability: "Care planning",
    phase: "follow_up_closure",
    status: "planned",
    version: "—",
    description: "Suggests physician-defined review intervals from longitudinal change.",
  },
  {
    id: "cohort-id",
    name: "Cohort identification",
    capability: "Research matching",
    phase: "research",
    status: "planned",
    version: "—",
    description: "Matches de-identified cases to eligible research cohorts after consent.",
  },
];

export const INTEGRATION_STATUS_TONE: Record<IntegrationStatus, string> = {
  connected: "ready",
  mock: "processing",
  planned: "neutral",
};

export const AI_MODULE_STATUS_TONE: Record<AiModuleStatus, string> = {
  active: "ready",
  validation: "processing",
  planned: "neutral",
};

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: "Connected",
  mock: "Mock",
  planned: "Planned",
};

export const AI_MODULE_STATUS_LABEL: Record<AiModuleStatus, string> = {
  active: "Active",
  validation: "In validation",
  planned: "Planned",
};
