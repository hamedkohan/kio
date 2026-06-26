import type { KioRole } from "./caseState";
import type { ReportSectionStatus } from "./reportStatus";

export type ReportSectionType =
  | "clinical_context_placeholder"
  | "mri_protocol_and_quality"
  | "structured_visual_assessment"
  | "quantitative_biomarker_summary"
  | "radiologist_imaging_impression"
  | "radiologist_handoff"
  | "physician_synthesis_placeholder"
  | "patient_safe_summary_placeholder"
  | "limitations"
  | "recommendations_placeholder";

export type ReportStructuredItem = {
  id: string;
  label: string;
  value: string;
  sourceEvidenceReferenceId?: string;
  patientVisible: boolean;
};

export type ReportSection = {
  id: string;
  reportId: string;
  sectionType: ReportSectionType;
  title: string;
  status: ReportSectionStatus;
  content: string;
  structuredItems: ReportStructuredItem[];
  evidenceReferenceIds: string[];
  authorRole: KioRole;
  reviewerRole?: KioRole;
  createdAt: string;
  updatedAt: string;
  limitations: string[];
  patientVisible: boolean;
  requiredForCompletion: boolean;
};

export function isSectionPatientSafe(section: ReportSection) {
  return section.patientVisible && section.sectionType === "patient_safe_summary_placeholder";
}
