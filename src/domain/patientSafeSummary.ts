import type { KioRole } from "./caseState";
import type { ReportEvidenceSourceType } from "./reportEvidence";

export type PatientSafeSummaryDraftStatus =
  | "not_started"
  | "draft"
  | "needs_revision"
  | "ready_for_publication_review"
  | "approved_placeholder"
  | "superseded"
  | "voided";

export type PatientSafeSummaryAudience = "patient" | "caregiver" | "patient_and_caregiver";

export type ExcludedContentType =
  | "raw_ai_output"
  | "raw_biomarker_metric"
  | "percentile_table"
  | "segmentation_map"
  | "raw_visual_score"
  | "internal_note"
  | "draft_clinical_interpretation"
  | "algorithm_metadata"
  | "research_metadata";

export type PatientSafeExclusion = {
  id: string;
  excludedContentType: ExcludedContentType;
  reason: string;
  sourceId: string;
  sourceType: ReportEvidenceSourceType | "clinical_synthesis" | "research_metadata";
};

export type PatientSafeSummaryDraft = {
  id: string;
  caseId: string;
  physicianSynthesisId: string;
  status: PatientSafeSummaryDraftStatus;
  createdAt: string;
  updatedAt: string;
  createdByRole: Extract<KioRole, "physician_neurologist">;
  audience: PatientSafeSummaryAudience;
  plainLanguageSummary: string;
  whatWasReviewed: string;
  whatThisMeans: string;
  limitationsInPlainLanguage: string[];
  recommendedNextSteps: string[];
  followUpInstructions: string[];
  caregiverNotes: string[];
  excludedUnsafeContent: PatientSafeExclusion[];
  sourceEvidenceReferenceIds: string[];
  readyForPublicationReview: boolean;
  patientVisible: boolean;
};

export type PatientSafeSummaryPreview = {
  id: string;
  caseId: string;
  status: PatientSafeSummaryDraftStatus;
  plainLanguageSummary: string;
  whatWasReviewed: string;
  whatThisMeans: string;
  limitationsInPlainLanguage: string[];
  recommendedNextSteps: string[];
  followUpInstructions: string[];
  readyForPublicationReview: boolean;
  patientVisible: false;
};

export type PatientSafeSummaryDraftInput = {
  id: string;
  caseId: string;
  physicianSynthesisId: string;
  createdAt: string;
  plainLanguageSummary: string;
  whatWasReviewed: string;
  whatThisMeans: string;
  sourceEvidenceReferenceIds?: string[];
  limitationsInPlainLanguage?: string[];
  recommendedNextSteps?: string[];
  followUpInstructions?: string[];
  caregiverNotes?: string[];
  excludedUnsafeContent?: PatientSafeExclusion[];
};

export function createPatientSafeSummaryDraft(input: PatientSafeSummaryDraftInput): PatientSafeSummaryDraft {
  return {
    id: input.id,
    caseId: input.caseId,
    physicianSynthesisId: input.physicianSynthesisId,
    status: "draft",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    createdByRole: "physician_neurologist",
    audience: "patient_and_caregiver",
    plainLanguageSummary: input.plainLanguageSummary,
    whatWasReviewed: input.whatWasReviewed,
    whatThisMeans: input.whatThisMeans,
    limitationsInPlainLanguage: input.limitationsInPlainLanguage ?? [],
    recommendedNextSteps: input.recommendedNextSteps ?? [],
    followUpInstructions: input.followUpInstructions ?? [],
    caregiverNotes: input.caregiverNotes ?? [],
    excludedUnsafeContent: input.excludedUnsafeContent ?? DEFAULT_PATIENT_SAFE_EXCLUSIONS(input.id),
    sourceEvidenceReferenceIds: input.sourceEvidenceReferenceIds ?? [],
    readyForPublicationReview: false,
    patientVisible: false,
  };
}

function DEFAULT_PATIENT_SAFE_EXCLUSIONS(prefix: string): PatientSafeExclusion[] {
  return [
    { id: `${prefix}-exclude-raw-ai`, excludedContentType: "raw_ai_output", reason: "AI output is decision-support evidence and requires clinical review.", sourceId: "ai-output", sourceType: "biomarker_output" },
    { id: `${prefix}-exclude-percentile`, excludedContentType: "percentile_table", reason: "Raw percentiles are not patient-safe without physician-approved explanation.", sourceId: "quantitative-table", sourceType: "biomarker_metric" },
    { id: `${prefix}-exclude-visual-score`, excludedContentType: "raw_visual_score", reason: "Visual rating scores are internal imaging evidence.", sourceId: "visual-rating-score", sourceType: "visual_rating_score" },
  ];
}
