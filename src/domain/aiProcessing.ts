import type { KioRole } from "./caseState";

export type AiProcessingStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "failed"
  | "completed"
  | "qc_pending"
  | "qc_passed"
  | "qc_passed_with_limitations"
  | "qc_failed"
  | "reprocessing_requested"
  | "suppressed";

export type AiProcessingJobType =
  | "initial_processing"
  | "reprocessing"
  | "longitudinal_processing"
  | "technical_qc_only";

export type MriStudySource = "pacs" | "patient_upload" | "manual_upload" | "prototype_fixture";

export type MriStudyQualityStatus =
  | "not_checked"
  | "pending"
  | "passed"
  | "passed_with_limitations"
  | "failed"
  | "not_available";

export type MriStudyReference = {
  id: string;
  caseId: string;
  studyDate: string;
  modality: "MRI";
  protocolName: string;
  source: MriStudySource;
  requiredSequences: string[];
  availableSequences: string[];
  missingSequences: string[];
  qualityStatus: MriStudyQualityStatus;
  scannerVendor?: string;
  scannerFieldStrength?: "1.5T" | "3T" | "unknown";
  inputSeriesIds: string[];
  notes?: string;
  createdAt: string;
};

export type AiProcessingJob = {
  id: string;
  caseId: string;
  mriStudyId: string;
  jobType: AiProcessingJobType;
  status: AiProcessingStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  requestedByRole: KioRole;
  pipelineName: string;
  pipelineVersion: string;
  algorithmVersion: string;
  referenceDatasetVersion: string;
  inputSeries: string[];
  outputIds: string[];
  failureReason?: string;
  qcStatus: AiProcessingStatus;
  auditEventIds: string[];
};

export const AI_PROCESSING_STATUSES: AiProcessingStatus[] = [
  "not_started",
  "pending",
  "in_progress",
  "failed",
  "completed",
  "qc_pending",
  "qc_passed",
  "qc_passed_with_limitations",
  "qc_failed",
  "reprocessing_requested",
  "suppressed",
];
