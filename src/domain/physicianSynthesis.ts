import type { KioRole } from "./caseState";

export type PhysicianClinicalSynthesisStatus =
  | "not_started"
  | "in_progress"
  | "draft"
  | "needs_more_information"
  | "ready_for_review"
  | "ready_for_final_approval"
  | "returned_for_revision"
  | "superseded"
  | "voided";

export type PhysicianEvidenceAdequacyStatus =
  | "adequate"
  | "adequate_with_limitations"
  | "insufficient"
  | "requires_follow_up"
  | "not_reviewed";

export type PhysicianClinicalSynthesis = {
  id: string;
  caseId: string;
  status: PhysicianClinicalSynthesisStatus;
  createdAt: string;
  updatedAt: string;
  createdByRole: Extract<KioRole, "physician_neurologist">;
  physicianReviewerRole: Extract<KioRole, "physician_neurologist">;
  sourceReportIds: string[];
  sourceRadiologistHandoffIds: string[];
  sourceStructuredVisualAssessmentIds: string[];
  sourceBiomarkerOutputIds: string[];
  sourceEvidenceReferenceIds: string[];
  clinicalContextSummary: string;
  imagingEvidenceSummary: string;
  quantitativeEvidenceSummary: string;
  structuredVisualEvidenceSummary: string;
  limitations: string[];
  clinicalInterpretationDraft: string;
  differentialConsiderations: string[];
  recommendationsDraft: string[];
  followUpConsiderations: string[];
  requiresAdditionalClinicalData: boolean;
  openQuestions: string[];
  patientSafeSummaryDraftId?: string;
  suitableForFinalApproval: boolean;
  patientVisible: boolean;
  researchEligible: boolean;
};

export type PhysicianEvidenceReview = {
  id: string;
  caseId: string;
  physicianSynthesisId: string;
  reviewedAt?: string;
  reviewedByRole: Extract<KioRole, "physician_neurologist">;
  reviewedReportIds: string[];
  reviewedBiomarkerOutputIds: string[];
  reviewedStructuredVisualAssessmentIds: string[];
  reviewedRadiologistHandoffIds: string[];
  evidenceAdequacyStatus: PhysicianEvidenceAdequacyStatus;
  missingInformation: string[];
  limitations: string[];
  reviewNotes: string;
  readyForSynthesis: boolean;
};

export type PhysicianClinicalSynthesisDraftInput = {
  id: string;
  caseId: string;
  createdAt: string;
  sourceReportIds?: string[];
  sourceRadiologistHandoffIds?: string[];
  sourceStructuredVisualAssessmentIds?: string[];
  sourceBiomarkerOutputIds?: string[];
  sourceEvidenceReferenceIds?: string[];
  clinicalContextSummary?: string;
  imagingEvidenceSummary?: string;
  quantitativeEvidenceSummary?: string;
  structuredVisualEvidenceSummary?: string;
  limitations?: string[];
  openQuestions?: string[];
  patientSafeSummaryDraftId?: string;
};

export type PhysicianEvidenceReviewDraftInput = {
  id: string;
  caseId: string;
  physicianSynthesisId: string;
  reviewedReportIds?: string[];
  reviewedBiomarkerOutputIds?: string[];
  reviewedStructuredVisualAssessmentIds?: string[];
  reviewedRadiologistHandoffIds?: string[];
  missingInformation?: string[];
  limitations?: string[];
  reviewNotes?: string;
  evidenceAdequacyStatus?: PhysicianEvidenceAdequacyStatus;
};

export function createPhysicianClinicalSynthesisDraft(input: PhysicianClinicalSynthesisDraftInput): PhysicianClinicalSynthesis {
  return {
    id: input.id,
    caseId: input.caseId,
    status: "draft",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    createdByRole: "physician_neurologist",
    physicianReviewerRole: "physician_neurologist",
    sourceReportIds: input.sourceReportIds ?? [],
    sourceRadiologistHandoffIds: input.sourceRadiologistHandoffIds ?? [],
    sourceStructuredVisualAssessmentIds: input.sourceStructuredVisualAssessmentIds ?? [],
    sourceBiomarkerOutputIds: input.sourceBiomarkerOutputIds ?? [],
    sourceEvidenceReferenceIds: input.sourceEvidenceReferenceIds ?? [],
    clinicalContextSummary: input.clinicalContextSummary ?? "Clinical context summary pending physician completion.",
    imagingEvidenceSummary: input.imagingEvidenceSummary ?? "Reviewed imaging evidence will be synthesized by the physician.",
    quantitativeEvidenceSummary: input.quantitativeEvidenceSummary ?? "Reviewed quantitative evidence only; raw AI output is excluded.",
    structuredVisualEvidenceSummary: input.structuredVisualEvidenceSummary ?? "Structured visual assessment is imaging evidence, not diagnosis.",
    limitations: input.limitations ?? ["Physician synthesis draft only; no final approval or publication lifecycle is implemented."],
    clinicalInterpretationDraft: "",
    differentialConsiderations: [],
    recommendationsDraft: [],
    followUpConsiderations: [],
    requiresAdditionalClinicalData: false,
    openQuestions: input.openQuestions ?? [],
    patientSafeSummaryDraftId: input.patientSafeSummaryDraftId,
    suitableForFinalApproval: false,
    patientVisible: false,
    researchEligible: false,
  };
}

export function createPhysicianEvidenceReviewDraft(input: PhysicianEvidenceReviewDraftInput): PhysicianEvidenceReview {
  const adequacy = input.evidenceAdequacyStatus ?? (input.missingInformation?.length ? "insufficient" : "adequate_with_limitations");
  return {
    id: input.id,
    caseId: input.caseId,
    physicianSynthesisId: input.physicianSynthesisId,
    reviewedByRole: "physician_neurologist",
    reviewedReportIds: input.reviewedReportIds ?? [],
    reviewedBiomarkerOutputIds: input.reviewedBiomarkerOutputIds ?? [],
    reviewedStructuredVisualAssessmentIds: input.reviewedStructuredVisualAssessmentIds ?? [],
    reviewedRadiologistHandoffIds: input.reviewedRadiologistHandoffIds ?? [],
    evidenceAdequacyStatus: adequacy,
    missingInformation: input.missingInformation ?? [],
    limitations: input.limitations ?? ["Evidence review is a physician synthesis input, not a final diagnosis."],
    reviewNotes: input.reviewNotes ?? "",
    readyForSynthesis: adequacy === "adequate" || adequacy === "adequate_with_limitations",
  };
}
