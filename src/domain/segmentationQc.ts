import type { KioRole } from "./caseState";

export type SegmentationQcStatus =
  | "pending"
  | "passed"
  | "passed_with_limitations"
  | "failed"
  | "reprocessing_requested"
  | "suppressed";

export type RadiologistSegmentationAcceptanceStatus =
  | "not_reviewed"
  | "accepted"
  | "accepted_with_limitations"
  | "rejected";

export type SegmentationQcIssue = {
  code: string;
  label: string;
  severity: "info" | "warning" | "blocking";
  region?: string;
};

export type SegmentationQc = {
  id: string;
  caseId: string;
  mriStudyId: string;
  aiProcessingJobId: string;
  status: SegmentationQcStatus;
  technicalReviewerRole: Extract<KioRole, "mri_scientist_ai_qa">;
  technicalReviewedAt?: string;
  radiologistAcceptanceStatus: RadiologistSegmentationAcceptanceStatus;
  radiologistAcceptedAt?: string;
  issues: SegmentationQcIssue[];
  limitations: string[];
  reprocessingRecommended: boolean;
  suitableForQuantitativeReview: boolean;
  suitableForPhysicianHandoff: boolean;
};
