import type { CaseAction } from "./caseState";
import type { PermissionResource } from "./permissions";
import type { RoleId } from "./roles";

export const HIGH_RISK_RESOURCES: PermissionResource[] = [
  "raw_biomarker_values",
  "quantitative_percentiles",
  "segmentation_maps",
  "clinical_interpretation",
  "internal_notes",
  "draft_report",
  "research_dataset",
];

export const CLINICALLY_MEANINGFUL_ACTIONS: CaseAction[] = [
  "PASS_IMAGE_QUALITY",
  "FAIL_IMAGE_QUALITY",
  "COMPLETE_TECHNICAL_SEGMENTATION_QC",
  "COMPLETE_QUANTITATIVE_OUTPUT_REVIEW",
  "COMPLETE_RADIOLOGIST_REVIEW",
  "DRAFT_FINAL_REPORT",
  "DRAFT_PATIENT_SAFE_SUMMARY",
  "SUBMIT_FINAL_CLINICAL_APPROVAL",
  "APPROVE_PUBLICATION",
  "PUBLISH_TO_PATIENT_PORTAL",
  "REQUEST_REPROCESSING",
  "APPROVE_RESEARCH_EXPORT",
];

export const DEFAULT_WORKSPACE_ROLES: Record<string, RoleId[]> = {
  operations: ["operations_coordinator", "organization_admin"],
  radiologist: ["radiologist", "neuroradiologist", "mri_scientist_ai_qa"],
  physician: ["physician_neurologist"],
  patient: ["patient", "caregiver"],
  research: ["researcher", "data_steward_research_admin"],
};
