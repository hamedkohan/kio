import type { KioRole } from "./caseState";

export type ReportEvidenceSourceType =
  | "mri_study"
  | "protocol_completeness_assessment"
  | "image_quality_assessment"
  | "structured_visual_assessment"
  | "visual_rating_score"
  | "radiologist_imaging_handoff"
  | "ai_processing_job"
  | "biomarker_output"
  | "biomarker_metric"
  | "segmentation_qc"
  | "clinical_biomarker_view";

export type ReportEvidenceVisibility =
  | "technical_qc"
  | "radiologist"
  | "physician"
  | "internal_clinical"
  | "patient_safe"
  | "research_deidentified"
  | "hidden";

export type ReportEvidenceReference = {
  id: string;
  reportId: string;
  sourceType: ReportEvidenceSourceType;
  sourceId: string;
  sourceVersion?: string;
  includedByRole: KioRole;
  includedAt: string;
  visibility: ReportEvidenceVisibility;
  limitations: string[];
  evidenceSummary: string;
  patientVisible: boolean;
};

export function isEvidencePatientSafe(reference: ReportEvidenceReference) {
  return reference.patientVisible && reference.visibility === "patient_safe";
}
