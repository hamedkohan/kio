import type { KioCase, TimelineEvent } from "../types";
import type { CaseState } from "./caseState";
import type { PatientPortalReleaseView } from "./publication";
import {
  allow,
  deny,
  stateAllowsApprovedPatientContent,
  stateAllowsPhysicianReviewedAi,
  stateAllowsRadiologyAiReview,
  type AccessContext,
  type PermissionDecision,
} from "./permissions";
import { normalizeRoleId, type RoleId } from "./roles";

export type CaseViewModel = {
  id: string;
  state: CaseState;
  caseStatus: string;
  nextAction: string;
  currentOwnerRole: string;
  canViewPatientIdentity: boolean;
  canViewClinicalContext: boolean;
  canViewClinicalInterpretation: boolean;
  canViewRawAiOutput: boolean;
  canViewInternalNotes: boolean;
};

export type PatientSafeCaseView = {
  id: string;
  patientFirstName: string;
  state: CaseState;
  safeStatus: string;
  nextPatientAction: string;
  intakeStatus: string;
  mriStatus: string;
  consentStatus: string;
  researchConsentStatus: string;
  followUpStatus: string;
  reportAvailable: boolean;
  approvedSummary?: string;
  releaseTitle?: string;
  approvedRelease?: PatientPortalReleaseView;
  patientFormProgress: number;
  timeline: TimelineEvent[];
  caregiverAccessStatus: string;
};

export type ResearchSafeCaseView = {
  researchCaseId: string;
  state: CaseState;
  ageBand: string;
  sex?: KioCase["sex"];
  relativeTimepoint: string;
  timepointCount: number;
  consentStatus: string;
  anonymizationStatus: string;
  eligibilityStatus: string;
  highLevelQcStatus: string;
  aiStatus: string;
  metricAvailability: string;
  exportStatus: string;
  datasetVersion: string;
  withdrawalStatus: string;
  longitudinal: boolean;
};

export function canViewPatientIdentity(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "operations_coordinator" || role === "physician_neurologist") return allow(role === "operations_coordinator" ? "operational" : "clinical_review");
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review", "Limited identifier allowed for assigned imaging review.");
  if (role === "patient") return context.isSelfPatientCase ? allow("safe_status") : deny("Patient can view only own identity.");
  if (role === "caregiver") return context.isAuthorizedCaregiver ? allow("safe_status") : deny("Caregiver identity access requires authorization.");
  return deny("Role cannot view patient identity.");
}

export function canViewPatientContactAdminInfo(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "operations_coordinator") return allow("operational");
  if (role === "patient" && context.isSelfPatientCase) return allow("safe_status");
  if (role === "caregiver" && context.isAuthorizedCaregiver) return allow("safe_status");
  return deny("Contact/admin information is restricted.");
}

export function canViewClinicalContext(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review", "Limited clinical context may be allowed for imaging interpretation.");
  if (role === "operations_coordinator") return deny("Operations can view completion status only, not clinical context.");
  return deny("Clinical context is restricted.");
}

export function canViewClinicalInterpretation(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "external_guest_reviewer" || role === "psychologist_neuropsychologist_guest") return context.guestAccessActive ? allow("clinical_review") : deny("Guest access is not active.");
  return deny("Clinical interpretation is physician-owned and restricted.");
}

export function canViewInternalNotes(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review");
  if (role === "mri_scientist_ai_qa") return allow("technical_ai_qc");
  return deny("Internal notes are not visible to this role.");
}

export function canViewAuditHistory(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "operations_coordinator" || role === "organization_admin" || role === "data_steward_research_admin") return allow("admin_metadata");
  return deny("Audit visibility is scoped and not available to this role.");
}

export function canViewAiProcessingStatus(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (["operations_coordinator", "radiologist", "neuroradiologist", "mri_scientist_ai_qa", "physician_neurologist"].includes(role)) return allow(scopeForAi(role));
  if (role === "researcher") return allow("deidentified_research");
  return deny("AI processing status is hidden from patient/caregiver views.");
}

export function canViewRawAiOutput(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "radiologist" || role === "neuroradiologist") return stateAllowsRadiologyAiReview(caseRecord) ? allow("imaging_review") : deny("AI output is not available for radiology review in this state.");
  if (role === "mri_scientist_ai_qa") return allow("technical_ai_qc");
  if (role === "physician_neurologist") return deny("Physician cannot view unreviewed raw AI output in MVP.");
  if (role === "researcher") return deny("Researcher must use de-identified research-safe views, not raw clinical AI output.");
  return deny("Raw AI output is restricted.");
}

export function canViewQuantitativePercentiles(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "radiologist" || role === "neuroradiologist" || role === "mri_scientist_ai_qa") return allow(scopeForAi(role));
  if (role === "physician_neurologist") return stateAllowsPhysicianReviewedAi(caseRecord) ? allow("clinical_review") : deny("Physician can view quantitative evidence only after radiologist-reviewed handoff.");
  if (role === "researcher" && context.researchPurposeApproved) return allow("deidentified_research");
  return deny("Percentile values are restricted.");
}

export function canViewSegmentationMaps(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review");
  if (role === "mri_scientist_ai_qa") return allow("technical_ai_qc");
  return deny("Segmentation maps are not visible to this role.");
}

export function canViewAlgorithmMetadata(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "radiologist" || role === "neuroradiologist" || role === "mri_scientist_ai_qa") return allow(scopeForAi(role));
  if (role === "researcher" || role === "data_steward_research_admin") return allow("deidentified_research");
  return deny("Algorithm metadata is restricted.");
}

export function canViewQcStatus(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (["operations_coordinator", "radiologist", "neuroradiologist", "mri_scientist_ai_qa", "physician_neurologist", "researcher", "data_steward_research_admin"].includes(role)) return allow(scopeForAi(role));
  return deny("QC status is hidden from patient/caregiver views.");
}

export function canViewRadiologistReviewedQuantitativeSummary(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review");
  if (role === "physician_neurologist") return stateAllowsPhysicianReviewedAi(caseRecord) ? allow("clinical_review") : deny("Radiologist handoff is required before physician visibility.");
  return deny("Reviewed quantitative summary is restricted.");
}

export function canViewPhysicianEvidenceSummary(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  return deny("Physician evidence summary is restricted.");
}

export function canViewPatientSafeExplanation(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "patient") return context.isSelfPatientCase && stateAllowsApprovedPatientContent(caseRecord) ? allow("approved_patient") : allow("safe_status", "Only safe status is visible before publication.");
  if (role === "caregiver") return context.isAuthorizedCaregiver && stateAllowsApprovedPatientContent(caseRecord) ? allow("approved_patient") : allow("safe_status", "Only safe status is visible before publication.");
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "operations_coordinator") return allow("operational", "Operations can see publication readiness, not clinical interpretation.");
  return deny("Patient-safe explanation is restricted.");
}

export function canViewDraftReport(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "radiologist" || role === "neuroradiologist") return allow("imaging_review");
  return deny("Draft reports are restricted.");
}

export function canViewPhysicianFinalReport(_caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "physician_neurologist") return allow("clinical_review");
  return deny("Final clinical report is physician-owned and restricted.");
}

export function canViewApprovedPatientPortalContent(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  if (!stateAllowsApprovedPatientContent(caseRecord)) return deny("Approved patient portal content is not published yet.");
  const role = normalizeRoleId(context.role);
  if (role === "patient" && context.isSelfPatientCase) return allow("approved_patient");
  if (role === "caregiver" && context.isAuthorizedCaregiver) return allow("approved_patient");
  if (role === "physician_neurologist" || role === "operations_coordinator") return allow(scopeForAi(role));
  return deny("Approved portal content is restricted.");
}

export function canViewPdfRendering(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "patient" || role === "caregiver") return canViewApprovedPatientPortalContent(caseRecord, context);
  if (role === "physician_neurologist") return allow("clinical_review");
  if (role === "operations_coordinator") return allow("operational", "PDF rendering status only; PDF is not the source object.");
  return deny("PDF rendering is restricted.");
}

export function getVisibleCaseForRole(caseRecord: KioCase, context: AccessContext): CaseViewModel | PatientSafeCaseView | ResearchSafeCaseView {
  const role = normalizeRoleId(context.role);
  if (role === "patient" || role === "caregiver") return toPatientSafeCaseView(caseRecord, context);
  if (role === "researcher" || role === "data_steward_research_admin") return toResearchSafeCaseView(caseRecord, context);
  return {
    id: caseRecord.id,
    state: caseRecord.state,
    caseStatus: caseRecord.caseStatus,
    nextAction: caseRecord.nextAction,
    currentOwnerRole: caseRecord.currentOwnerRole,
    canViewPatientIdentity: canViewPatientIdentity(caseRecord, context).allowed,
    canViewClinicalContext: canViewClinicalContext(caseRecord, context).allowed,
    canViewClinicalInterpretation: canViewClinicalInterpretation(caseRecord, context).allowed,
    canViewRawAiOutput: canViewRawAiOutput(caseRecord, context).allowed,
    canViewInternalNotes: canViewInternalNotes(caseRecord, context).allowed,
  };
}

export function toPatientSafeCaseView(caseRecord: KioCase, context: AccessContext, approvedRelease?: PatientPortalReleaseView): PatientSafeCaseView {
  const canSeeApproved = canViewApprovedPatientPortalContent(caseRecord, context).allowed;
  const releaseAvailable = Boolean(canSeeApproved && approvedRelease);
  return {
    id: caseRecord.id,
    patientFirstName: caseRecord.patientName.split(" ")[0] ?? "Patient",
    state: caseRecord.state,
    safeStatus: caseRecord.patientSafeStatus,
    nextPatientAction: caseRecord.patientNextAction,
    intakeStatus: caseRecord.intakeStatus,
    mriStatus: caseRecord.mriStatus,
    consentStatus: caseRecord.consentStatus,
    researchConsentStatus: caseRecord.researchConsent,
    followUpStatus: caseRecord.followUpStatus,
    reportAvailable: releaseAvailable,
    approvedSummary: releaseAvailable ? approvedRelease?.plainLanguageSummary : undefined,
    releaseTitle: releaseAvailable ? approvedRelease?.releaseTitle : undefined,
    approvedRelease: releaseAvailable ? approvedRelease : undefined,
    patientFormProgress: caseRecord.patientFormProgress,
    timeline: caseRecord.timeline.filter((event) => event.patientSafe),
    caregiverAccessStatus: "Not configured",
  };
}

export function toResearchSafeCaseView(caseRecord: KioCase, context: AccessContext): ResearchSafeCaseView {
  const allowed = canViewResearchDataset(caseRecord, context).allowed;
  return {
    researchCaseId: allowed ? caseRecord.anonymizedId : "restricted",
    state: caseRecord.state,
    ageBand: allowed ? caseRecord.ageGroup : "restricted",
    sex: allowed ? caseRecord.sex : undefined,
    relativeTimepoint: allowed ? caseRecord.researchTimepoint : "restricted",
    timepointCount: caseRecord.longitudinal ? 2 : 1,
    consentStatus: allowed ? caseRecord.researchConsent : "restricted",
    anonymizationStatus: allowed ? caseRecord.anonymizationStatus : "restricted",
    eligibilityStatus: caseRecord.researchEligible ? "Eligible" : "Not eligible",
    highLevelQcStatus: allowed ? caseRecord.imageQuality : "restricted",
    aiStatus: allowed ? caseRecord.aiStatus : "restricted",
    metricAvailability: allowed && (caseRecord.biomarkerOutputIds?.length || caseRecord.findings.length) ? "De-identified metrics available" : "Unavailable",
    exportStatus: allowed ? caseRecord.exportVersion : "restricted",
    datasetVersion: allowed ? caseRecord.datasetVersion : "restricted",
    withdrawalStatus: allowed ? caseRecord.withdrawalStatus : "restricted",
    longitudinal: caseRecord.longitudinal,
  };
}

export function canViewResearchDataset(caseRecord: KioCase, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "researcher" && role !== "data_steward_research_admin") return deny("Only research roles can view research-safe datasets.");
  if (!caseRecord.researchEligible) return deny("Case is not research eligible.");
  if (caseRecord.researchConsent !== "Consented") return deny("Research consent is not valid.");
  if (caseRecord.anonymizationStatus !== "Anonymized") return deny("Anonymization is not complete.");
  return allow("deidentified_research");
}

function scopeForAi(role: RoleId) {
  if (role === "radiologist" || role === "neuroradiologist") return "imaging_review";
  if (role === "mri_scientist_ai_qa") return "technical_ai_qc";
  if (role === "physician_neurologist") return "clinical_review";
  if (role === "researcher" || role === "data_steward_research_admin") return "deidentified_research";
  return "operational";
}
