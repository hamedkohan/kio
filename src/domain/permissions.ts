import { canTransition, CASE_TRANSITIONS, type CaseStatefulRecord, type TransitionContext } from "./caseTransitions";
import { CASE_STATE_DEFINITIONS, type CaseAction } from "./caseState";
import { getAllowedActions, isResearchState } from "./caseStateSelectors";
import { normalizeRoleId, type RoleId } from "./roles";

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "approve"
  | "publish"
  | "export"
  | "request"
  | "transition"
  | "sign_off";

export type PermissionResource =
  | "case"
  | "case_workflow_state"
  | "patient_identity"
  | "patient_admin_contact"
  | "clinical_context"
  | "clinical_interpretation"
  | "internal_notes"
  | "audit_history"
  | "ai_processing_status"
  | "ai_output_readiness"
  | "raw_biomarker_values"
  | "quantitative_percentiles"
  | "segmentation_maps"
  | "algorithm_metadata"
  | "qc_status"
  | "radiologist_quantitative_summary"
  | "physician_evidence_summary"
  | "patient_safe_explanation"
  | "draft_report"
  | "radiologist_imaging_summary"
  | "physician_final_report"
  | "patient_safe_summary"
  | "approved_patient_portal_content"
  | "pdf_rendering"
  | "research_dataset";

export type VisibilityScope =
  | "none"
  | "safe_status"
  | "operational"
  | "technical_ai_qc"
  | "imaging_review"
  | "clinical_review"
  | "approved_patient"
  | "deidentified_research"
  | "admin_metadata";

export type AccessContext = {
  role: RoleId | string;
  actorId?: string;
  isAssignedToCase?: boolean;
  isSelfPatientCase?: boolean;
  isAuthorizedCaregiver?: boolean;
  guestAccessActive?: boolean;
  researchPurposeApproved?: boolean;
};

export type PermissionDecision = {
  allowed: boolean;
  scope: VisibilityScope;
  reason?: string;
};

export function allow(scope: VisibilityScope, reason?: string): PermissionDecision {
  return { allowed: true, scope, reason };
}

export function deny(reason: string): PermissionDecision {
  return { allowed: false, scope: "none", reason };
}

export function canViewCase(caseRecord: CaseStatefulRecord, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "patient") return context.isSelfPatientCase ? allow("safe_status") : deny("Patient can view only their own safe case view.");
  if (role === "caregiver") return context.isAuthorizedCaregiver ? allow("safe_status") : deny("Caregiver access must be explicitly authorized.");
  if (role === "researcher") return isResearchEligibleForRole(caseRecord, context) ? allow("deidentified_research") : deny("Researcher can view only de-identified, consented research-safe records.");
  if (role === "external_guest_reviewer" || role === "psychologist_neuropsychologist_guest") return context.guestAccessActive ? allow("clinical_review") : deny("Guest access must be active, scoped, and time-limited.");
  if (role === "organization_admin") return allow("admin_metadata");
  return allow(scopeForRole(role));
}

export function canCreateCase(context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  return role === "operations_coordinator" ? allow("operational") : deny("Only Operations can create operational case shells in MVP.");
}

export function canUpdateCaseWorkflowState(caseRecord: CaseStatefulRecord, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  if (role === "operations_coordinator" && ["case_initiation", "mri_intake", "publication", "follow_up_closure"].includes(CASE_STATE_DEFINITIONS[caseRecord.state].phase)) return allow("operational");
  if ((role === "radiologist" || role === "neuroradiologist") && ["imaging_readiness", "ai_validation", "radiologist_review"].includes(CASE_STATE_DEFINITIONS[caseRecord.state].phase)) return allow("imaging_review");
  if (role === "mri_scientist_ai_qa" && ["ai_processing", "ai_validation"].includes(CASE_STATE_DEFINITIONS[caseRecord.state].phase)) return allow("technical_ai_qc");
  if (role === "physician_neurologist" && ["physician_review", "publication"].includes(CASE_STATE_DEFINITIONS[caseRecord.state].phase)) return allow("clinical_review");
  if (role === "data_steward_research_admin" && CASE_STATE_DEFINITIONS[caseRecord.state].phase === "research") return allow("deidentified_research");
  return deny("Role cannot update workflow state for this case phase.");
}

export function canPerformCaseAction(caseRecord: CaseStatefulRecord, action: CaseAction, context: AccessContext): PermissionDecision {
  const role = normalizeRoleId(context.role);
  const allowedByState = CASE_STATE_DEFINITIONS[caseRecord.state].allowedActions.includes(action);
  if (!allowedByState) return deny(`${action} is not available from ${caseRecord.state}.`);

  const roleAllowedActions: Partial<Record<RoleId, CaseAction[]>> = {
    operations_coordinator: ["CREATE_CASE", "REQUEST_PATIENT_INFORMATION", "REQUEST_CONSENT", "REQUEST_MRI", "RECEIVE_MRI", "START_MRI_INTAKE_REVIEW", "COMPLETE_MRI_INTAKE_REVIEW", "PUBLISH_TO_PATIENT_PORTAL", "START_FOLLOW_UP_COORDINATION", "CLOSE_CASE"],
    radiologist: ["COMPLETE_PROTOCOL_CHECK", "PASS_IMAGE_QUALITY", "FAIL_IMAGE_QUALITY", "COMPLETE_QUANTITATIVE_OUTPUT_REVIEW", "COMPLETE_STRUCTURED_VISUAL_REPORT", "START_RADIOLOGIST_REVIEW", "COMPLETE_RADIOLOGIST_REVIEW", "REQUEST_REPROCESSING"],
    neuroradiologist: ["COMPLETE_PROTOCOL_CHECK", "PASS_IMAGE_QUALITY", "FAIL_IMAGE_QUALITY", "COMPLETE_QUANTITATIVE_OUTPUT_REVIEW", "COMPLETE_STRUCTURED_VISUAL_REPORT", "START_RADIOLOGIST_REVIEW", "COMPLETE_RADIOLOGIST_REVIEW", "REQUEST_REPROCESSING"],
    mri_scientist_ai_qa: ["START_AI_PROCESSING", "COMPLETE_AI_PROCESSING", "FAIL_AI_PROCESSING", "START_SEGMENTATION_REVIEW", "COMPLETE_TECHNICAL_SEGMENTATION_QC", "REQUEST_REPROCESSING"],
    physician_neurologist: ["START_PHYSICIAN_SYNTHESIS", "START_PHYSICIAN_REVIEW", "REQUEST_EXTERNAL_OPINION", "DRAFT_FINAL_REPORT", "DRAFT_PATIENT_SAFE_SUMMARY", "SUBMIT_FINAL_CLINICAL_APPROVAL", "APPROVE_PUBLICATION"],
    patient: ["COMPLETE_PATIENT_INFORMATION", "RECORD_CONSENT"],
    caregiver: ["COMPLETE_PATIENT_INFORMATION"],
    data_steward_research_admin: ["START_RESEARCH_ELIGIBILITY", "MARK_RESEARCH_ELIGIBLE", "MARK_RESEARCH_NOT_ELIGIBLE", "PREPARE_DEIDENTIFIED_DATASET", "APPROVE_RESEARCH_EXPORT"],
  };

  return roleAllowedActions[role]?.includes(action)
    ? allow(scopeForRole(role))
    : deny("Role is not allowed to perform this action.");
}

export function canTransitionCaseState(caseRecord: CaseStatefulRecord, action: CaseAction, context: AccessContext & Partial<TransitionContext>): PermissionDecision {
  const actionDecision = canPerformCaseAction(caseRecord, action, context);
  if (!actionDecision.allowed) return actionDecision;
  const targetState = CASE_TRANSITIONS.find((transition) => transition.from === caseRecord.state && transition.action === action)?.to;
  if (!targetState) return deny("No next state is available.");
  const transitionDecision = canTransition(caseRecord, targetState, { actorRole: normalizeRoleId(context.role), ...context });
  return transitionDecision.allowed ? actionDecision : deny(transitionDecision.blockers.map((item) => item.message).join("; "));
}

export function canRequestReprocessing(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "REQUEST_REPROCESSING", context);
}

export function canCompleteTechnicalQc(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "COMPLETE_TECHNICAL_SEGMENTATION_QC", context);
}

export function canCompleteRadiologistReview(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "COMPLETE_RADIOLOGIST_REVIEW", context);
}

export function canStartPhysicianSynthesis(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "START_PHYSICIAN_SYNTHESIS", context);
}

export function canDraftFinalReport(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "DRAFT_FINAL_REPORT", context);
}

export function canDraftPatientSafeSummary(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "DRAFT_PATIENT_SAFE_SUMMARY", context);
}

export function canApprovePublication(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "APPROVE_PUBLICATION", context);
}

export function canCloseCase(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return canPerformCaseAction(caseRecord, "CLOSE_CASE", context);
}

export function getDeniedReason(resource: PermissionResource, action: PermissionAction, context: AccessContext) {
  return `${normalizeRoleId(context.role)} cannot ${action} ${resource}.`;
}

export function scopeForRole(role: RoleId): VisibilityScope {
  if (role === "operations_coordinator") return "operational";
  if (role === "radiologist" || role === "neuroradiologist") return "imaging_review";
  if (role === "mri_scientist_ai_qa") return "technical_ai_qc";
  if (role === "physician_neurologist") return "clinical_review";
  if (role === "patient" || role === "caregiver") return "safe_status";
  if (role === "researcher" || role === "data_steward_research_admin") return "deidentified_research";
  if (role === "organization_admin") return "admin_metadata";
  return "none";
}

export function isResearchEligibleForRole(caseRecord: CaseStatefulRecord, context: AccessContext) {
  return context.researchPurposeApproved || isResearchState(caseRecord.state);
}

export function stateAllowsPhysicianReviewedAi(caseRecord: CaseStatefulRecord) {
  const allowedStates = [
    "RADIOLOGIST_REVIEW_COMPLETED",
    "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING",
    "PHYSICIAN_REVIEW_IN_PROGRESS",
    "FINAL_REPORT_DRAFTED",
    "PATIENT_SAFE_SUMMARY_DRAFTED",
    "FINAL_CLINICAL_APPROVAL_PENDING",
    "PUBLICATION_APPROVED",
    "PUBLISHED_TO_PATIENT_PORTAL",
    "FOLLOW_UP_COORDINATION_PENDING",
    "CASE_CLOSED",
  ];
  return allowedStates.includes(caseRecord.state);
}

export function stateAllowsApprovedPatientContent(caseRecord: CaseStatefulRecord) {
  return ["PUBLISHED_TO_PATIENT_PORTAL", "FOLLOW_UP_COORDINATION_PENDING", "CASE_CLOSED"].includes(caseRecord.state);
}

export function stateAllowsRadiologyAiReview(caseRecord: CaseStatefulRecord) {
  const actions = getAllowedActions(caseRecord);
  return actions.includes("COMPLETE_QUANTITATIVE_OUTPUT_REVIEW")
    || actions.includes("COMPLETE_RADIOLOGIST_REVIEW")
    || ["QUANTITATIVE_OUTPUT_READY", "SEGMENTATION_REVIEW_PENDING", "QUANTITATIVE_OUTPUT_REVIEW_PENDING", "STRUCTURED_VISUAL_REPORT_PENDING", "RADIOLOGIST_REVIEW_IN_PROGRESS"].includes(caseRecord.state);
}
