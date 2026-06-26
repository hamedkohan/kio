import type { KioRole } from "./caseState";

export type ImageQualityReviewStatus =
  | "pending"
  | "passed"
  | "passed_with_limitations"
  | "failed"
  | "rescan_recommended"
  | "reprocessing_recommended";

export type SequenceQualityIssue = {
  sequence: string;
  issue: string;
  severity: "minor" | "moderate" | "major" | "blocking";
};

export type ImageQualityAssessment = {
  id: string;
  caseId: string;
  mriStudyId: string;
  reviewedByRole: Extract<KioRole, "radiologist" | "neuroradiologist" | "mri_scientist_ai_qa">;
  reviewedAt?: string;
  status: ImageQualityReviewStatus;
  motionArtifact: "none" | "mild" | "moderate" | "severe" | "not_assessed";
  coverageIssue: "none" | "minor" | "major" | "not_assessed";
  sequenceQualityIssues: SequenceQualityIssue[];
  majorLimitation: boolean;
  limitations: string[];
  suitableForRadiologistReview: boolean;
  suitableForAiProcessing: boolean;
  requiresRescan: boolean;
  requiresReprocessing: boolean;
  notes?: string;
};

export function isImageQualityAcceptableForReview(assessment?: ImageQualityAssessment) {
  return Boolean(
    assessment &&
      ["passed", "passed_with_limitations"].includes(assessment.status) &&
      assessment.suitableForRadiologistReview,
  );
}
