export type StructuredReportStatus =
  | "not_started"
  | "draft"
  | "in_review"
  | "reviewed"
  | "ready_for_physician_synthesis"
  | "physician_synthesis_draft"
  | "patient_safe_summary_draft"
  | "ready_for_final_approval"
  | "approved_placeholder"
  | "superseded"
  | "voided";

export type ReportSectionStatus =
  | "not_started"
  | "draft"
  | "complete"
  | "reviewed"
  | "blocked"
  | "not_applicable";

export type ReportIntendedAudience =
  | "radiologist"
  | "physician"
  | "patient_safe"
  | "research"
  | "internal_clinical"
  | "technical_qc";

export type ReportSourceOfTruth = "structured_data";

export const STRUCTURED_REPORT_STATUSES: StructuredReportStatus[] = [
  "not_started",
  "draft",
  "in_review",
  "reviewed",
  "ready_for_physician_synthesis",
  "physician_synthesis_draft",
  "patient_safe_summary_draft",
  "ready_for_final_approval",
  "approved_placeholder",
  "superseded",
  "voided",
];
