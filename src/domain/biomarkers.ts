import type { BiomarkerMetric } from "./biomarkerMetrics";
import type { SegmentationQc } from "./segmentationQc";
import type { KioRole } from "./caseState";

export type BiomarkerOutputType =
  | "volumetry"
  | "corticometry"
  | "ad_summary"
  | "longitudinal_comparison"
  | "segmentation_qc"
  | "technical_quantitative_report";

export type BiomarkerOutputStatus =
  | "draft"
  | "ready_for_technical_qc"
  | "technical_qc_passed"
  | "technical_qc_failed"
  | "ready_for_radiologist_review"
  | "radiologist_reviewed"
  | "suppressed";

export type BiomarkerReviewStatus =
  | "unreviewed"
  | "technical_qc_pending"
  | "technical_qc_passed"
  | "radiologist_review_pending"
  | "radiologist_reviewed"
  | "rejected"
  | "suppressed";

export type BiomarkerOutput = {
  id: string;
  caseId: string;
  mriStudyId: string;
  aiProcessingJobId: string;
  outputType: BiomarkerOutputType;
  status: BiomarkerOutputStatus;
  createdAt: string;
  version: string;
  algorithmVersion: string;
  referenceDatasetVersion: string;
  metrics: BiomarkerMetric[];
  segmentationQc?: SegmentationQc;
  reviewStatus: BiomarkerReviewStatus;
  reviewedByRole?: Extract<KioRole, "radiologist" | "neuroradiologist" | "mri_scientist_ai_qa">;
  reviewedAt?: string;
  limitations: string[];
  suppressionReason?: string;
  suitableForRadiologistReview: boolean;
  suitableForPhysicianReview: boolean;
  patientVisible: boolean;
  researchEligible: boolean;
};
