import type { BiomarkerOutputType } from "./biomarkers";
import type { KioRole } from "./caseState";

export type ReportTypeId =
  | "technical_quantitative_report"
  | "volumetry_report"
  | "corticometry_report"
  | "one_page_ad_neurotrack_summary"
  | "radiologist_reviewed_quantitative_summary"
  | "physician_facing_evidence_summary"
  | "physician_final_clinical_report"
  | "patient_safe_summary"
  | "research_export_dataset"
  | "research_data_dictionary_manifest";

export type ReportAudience =
  | "mri_scientist_ai_qa"
  | "radiologist"
  | "physician"
  | "patient_caregiver"
  | "research"
  | "operations";

export type ReportTypeDefinition = {
  id: ReportTypeId;
  label: string;
  audience: ReportAudience[];
  purpose: string;
  sourceOutputTypes: BiomarkerOutputType[];
  requiresHumanReview: boolean;
  signoffOwnerRole: KioRole | "none";
  patientVisible: boolean;
  researchEligible: boolean;
  structuredDataRequired: boolean;
  pdfRenderable: boolean;
  mvpEnabled: boolean;
};

export const REPORT_TYPE_DEFINITIONS: Record<ReportTypeId, ReportTypeDefinition> = {
  technical_quantitative_report: reportType("technical_quantitative_report", "Technical quantitative report", ["mri_scientist_ai_qa", "radiologist"], "Technical output for QC and imaging review.", ["technical_quantitative_report", "segmentation_qc", "volumetry"], true, "mri_scientist_ai_qa", false, false, true, false, true),
  volumetry_report: reportType("volumetry_report", "Volumetry report", ["radiologist", "physician"], "Structured volumetric evidence for review.", ["volumetry", "ad_summary"], true, "radiologist", false, true, true, true, true),
  corticometry_report: reportType("corticometry_report", "Corticometry report", ["radiologist", "physician"], "Optional cortical thickness evidence when enabled.", ["corticometry"], true, "radiologist", false, true, true, true, true),
  one_page_ad_neurotrack_summary: reportType("one_page_ad_neurotrack_summary", "One-page AD Neurotrack summary", ["physician"], "Condensed Alzheimer-focused evidence summary for clinical synthesis.", ["ad_summary", "volumetry", "longitudinal_comparison"], true, "physician_neurologist", false, false, true, true, true),
  radiologist_reviewed_quantitative_summary: reportType("radiologist_reviewed_quantitative_summary", "Radiologist-reviewed quantitative summary", ["radiologist", "physician"], "Reviewed quantitative imaging section handed off to physician.", ["volumetry", "corticometry", "ad_summary"], true, "radiologist", false, true, true, true, true),
  physician_facing_evidence_summary: reportType("physician_facing_evidence_summary", "Physician-facing evidence summary", ["physician"], "Reviewed evidence summary for clinical interpretation.", ["volumetry", "corticometry", "ad_summary", "longitudinal_comparison"], true, "physician_neurologist", false, false, true, false, true),
  physician_final_clinical_report: reportType("physician_final_clinical_report", "Physician final clinical report", ["physician"], "Physician-owned final clinical report object.", ["ad_summary", "longitudinal_comparison"], true, "physician_neurologist", false, false, true, true, true),
  patient_safe_summary: reportType("patient_safe_summary", "Patient-safe summary", ["patient_caregiver"], "Plain-language physician-approved summary after publication gate.", [], true, "physician_neurologist", true, false, true, true, true),
  research_export_dataset: reportType("research_export_dataset", "Research export dataset", ["research"], "Governed de-identified metric dataset.", ["volumetry", "corticometry", "ad_summary", "longitudinal_comparison"], true, "data_steward_research_admin", false, true, true, false, false),
  research_data_dictionary_manifest: reportType("research_data_dictionary_manifest", "Research data dictionary manifest", ["research"], "Metadata manifest for governed research exports.", ["volumetry", "corticometry", "ad_summary", "longitudinal_comparison"], true, "data_steward_research_admin", false, true, true, false, false),
};

function reportType(
  id: ReportTypeId,
  label: string,
  audience: ReportAudience[],
  purpose: string,
  sourceOutputTypes: BiomarkerOutputType[],
  requiresHumanReview: boolean,
  signoffOwnerRole: KioRole | "none",
  patientVisible: boolean,
  researchEligible: boolean,
  structuredDataRequired: boolean,
  pdfRenderable: boolean,
  mvpEnabled: boolean,
): ReportTypeDefinition {
  return { id, label, audience, purpose, sourceOutputTypes, requiresHumanReview, signoffOwnerRole, patientVisible, researchEligible, structuredDataRequired, pdfRenderable, mvpEnabled };
}
