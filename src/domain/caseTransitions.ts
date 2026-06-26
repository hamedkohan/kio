import { createAuditEvent, type AuditEvent } from "./audit";
import { CASE_STATE_DEFINITIONS, type CaseAction, type CaseBlocker, type CaseOwnerRole, type CaseState, type KioRole } from "./caseState";

export type TransitionGuard =
  | "HAS_PATIENT_INFORMATION"
  | "HAS_CLINICAL_CONSENT"
  | "HAS_MRI"
  | "MRI_INTAKE_REVIEWED"
  | "PROTOCOL_COMPLETE"
  | "IMAGE_QUALITY_ACCEPTED"
  | "AI_OUTPUT_READY"
  | "TECHNICAL_SEGMENTATION_QC_APPROVED"
  | "RADIOLOGIST_OUTPUT_ACCEPTED"
  | "STRUCTURED_VISUAL_REPORT_COMPLETE"
  | "RADIOLOGIST_HANDOFF_COMPLETE"
  | "PHYSICIAN_SYNTHESIS_STARTED"
  | "FINAL_REPORT_DRAFTED"
  | "PATIENT_SAFE_SUMMARY_DRAFTED"
  | "FINAL_CLINICAL_APPROVAL_COMPLETE"
  | "PUBLICATION_APPROVED"
  | "RESEARCH_CONSENT_VALID"
  | "DEIDENTIFIED_DATASET_READY"
  | "REASON_REQUIRED";

export type TransitionContext = {
  actorId?: string;
  actorRole: KioRole | CaseOwnerRole;
  timestamp?: string;
  reason?: string;
  hasPatientInformation?: boolean;
  hasClinicalConsent?: boolean;
  hasMri?: boolean;
  mriIntakeReviewed?: boolean;
  protocolComplete?: boolean;
  imageQualityAccepted?: boolean;
  aiOutputReady?: boolean;
  technicalSegmentationQcApproved?: boolean;
  radiologistOutputAccepted?: boolean;
  structuredVisualReportComplete?: boolean;
  radiologistHandoffComplete?: boolean;
  physicianSynthesisStarted?: boolean;
  finalReportDrafted?: boolean;
  patientSafeSummaryDrafted?: boolean;
  finalClinicalApprovalComplete?: boolean;
  publicationApproved?: boolean;
  researchConsentValid?: boolean;
  deidentifiedDatasetReady?: boolean;
};

export type CaseStatefulRecord = {
  id: string;
  state: CaseState;
  blockers?: CaseBlocker[];
  auditEvents?: AuditEvent[];
};

export type CaseTransition = {
  from: CaseState;
  action: CaseAction;
  to: CaseState;
  guards?: TransitionGuard[];
  requiresReason?: boolean;
  description: string;
};

export type TransitionResult<T extends CaseStatefulRecord = CaseStatefulRecord> = {
  success: boolean;
  caseRecord: T;
  previousState: CaseState;
  nextState: CaseState;
  action: CaseAction;
  actorRole: KioRole | CaseOwnerRole;
  timestamp: string;
  blockers: CaseBlocker[];
  auditEvent?: AuditEvent;
  reason?: string;
};

export const CASE_TRANSITIONS: CaseTransition[] = [
  tx("CASE_CREATED", "REQUEST_PATIENT_INFORMATION", "PATIENT_INFORMATION_PENDING"),
  tx("CASE_CREATED", "REQUEST_CONSENT", "CONSENT_PENDING"),
  tx("CASE_CREATED", "REQUEST_MRI", "MRI_REQUESTED"),
  tx("CASE_CREATED", "RECEIVE_MRI", "MRI_RECEIVED", ["HAS_MRI"]),
  tx("PATIENT_INFORMATION_PENDING", "COMPLETE_PATIENT_INFORMATION", "CONSENT_PENDING", ["HAS_PATIENT_INFORMATION"]),
  tx("PATIENT_INFORMATION_PENDING", "REQUEST_CONSENT", "CONSENT_PENDING"),
  tx("PATIENT_INFORMATION_PENDING", "REQUEST_MRI", "MRI_REQUESTED"),
  tx("CONSENT_PENDING", "RECORD_CONSENT", "MRI_REQUESTED", ["HAS_CLINICAL_CONSENT"]),
  tx("CONSENT_PENDING", "REQUEST_MRI", "MRI_REQUESTED"),
  tx("CONSENT_PENDING", "RECEIVE_MRI", "MRI_RECEIVED", ["HAS_MRI"]),
  tx("MRI_REQUESTED", "RECEIVE_MRI", "MRI_RECEIVED", ["HAS_MRI"]),
  tx("MRI_RECEIVED", "START_MRI_INTAKE_REVIEW", "MRI_INTAKE_REVIEW_PENDING"),
  tx("MRI_INTAKE_REVIEW_PENDING", "COMPLETE_MRI_INTAKE_REVIEW", "PROTOCOL_COMPLETENESS_CHECK_PENDING", ["MRI_INTAKE_REVIEWED"]),
  tx("PROTOCOL_COMPLETENESS_CHECK_PENDING", "COMPLETE_PROTOCOL_CHECK", "IMAGE_QUALITY_REVIEW_PENDING", ["PROTOCOL_COMPLETE"]),
  tx("IMAGE_QUALITY_REVIEW_PENDING", "PASS_IMAGE_QUALITY", "IMAGE_QUALITY_PASSED", ["IMAGE_QUALITY_ACCEPTED"]),
  tx("IMAGE_QUALITY_REVIEW_PENDING", "FAIL_IMAGE_QUALITY", "IMAGE_QUALITY_FAILED", ["REASON_REQUIRED"], true),
  tx("IMAGE_QUALITY_FAILED", "REQUEST_MRI", "MRI_REQUESTED", ["REASON_REQUIRED"], true),
  tx("IMAGE_QUALITY_FAILED", "CLOSE_CASE", "CASE_CLOSED", ["REASON_REQUIRED"], true),
  tx("IMAGE_QUALITY_PASSED", "QUEUE_AI_PROCESSING", "AI_PROCESSING_PENDING"),
  tx("AI_PROCESSING_PENDING", "START_AI_PROCESSING", "AI_PROCESSING_IN_PROGRESS"),
  tx("AI_PROCESSING_IN_PROGRESS", "COMPLETE_AI_PROCESSING", "QUANTITATIVE_OUTPUT_READY", ["AI_OUTPUT_READY"]),
  tx("AI_PROCESSING_IN_PROGRESS", "FAIL_AI_PROCESSING", "AI_PROCESSING_FAILED", ["REASON_REQUIRED"], true),
  tx("AI_PROCESSING_FAILED", "REQUEST_REPROCESSING", "REPROCESSING_REQUESTED", ["REASON_REQUIRED"], true),
  tx("AI_PROCESSING_FAILED", "COMPLETE_STRUCTURED_VISUAL_REPORT", "STRUCTURED_VISUAL_REPORT_PENDING", ["REASON_REQUIRED"], true),
  tx("QUANTITATIVE_OUTPUT_READY", "START_SEGMENTATION_REVIEW", "SEGMENTATION_REVIEW_PENDING"),
  tx("SEGMENTATION_REVIEW_PENDING", "COMPLETE_TECHNICAL_SEGMENTATION_QC", "QUANTITATIVE_OUTPUT_REVIEW_PENDING", ["TECHNICAL_SEGMENTATION_QC_APPROVED"]),
  tx("SEGMENTATION_REVIEW_PENDING", "REQUEST_REPROCESSING", "REPROCESSING_REQUESTED", ["REASON_REQUIRED"], true),
  tx("QUANTITATIVE_OUTPUT_REVIEW_PENDING", "COMPLETE_QUANTITATIVE_OUTPUT_REVIEW", "STRUCTURED_VISUAL_REPORT_PENDING", ["RADIOLOGIST_OUTPUT_ACCEPTED"]),
  tx("QUANTITATIVE_OUTPUT_REVIEW_PENDING", "REQUEST_REPROCESSING", "REPROCESSING_REQUESTED", ["REASON_REQUIRED"], true),
  tx("STRUCTURED_VISUAL_REPORT_PENDING", "START_RADIOLOGIST_REVIEW", "RADIOLOGIST_REVIEW_IN_PROGRESS"),
  tx("STRUCTURED_VISUAL_REPORT_PENDING", "COMPLETE_STRUCTURED_VISUAL_REPORT", "RADIOLOGIST_REVIEW_IN_PROGRESS", ["STRUCTURED_VISUAL_REPORT_COMPLETE"]),
  tx("RADIOLOGIST_REVIEW_IN_PROGRESS", "COMPLETE_RADIOLOGIST_REVIEW", "RADIOLOGIST_REVIEW_COMPLETED", ["RADIOLOGIST_HANDOFF_COMPLETE"]),
  tx("RADIOLOGIST_REVIEW_IN_PROGRESS", "REQUEST_REPROCESSING", "REPROCESSING_REQUESTED", ["REASON_REQUIRED"], true),
  tx("REPROCESSING_REQUESTED", "QUEUE_AI_PROCESSING", "AI_PROCESSING_PENDING"),
  tx("RADIOLOGIST_REVIEW_COMPLETED", "START_PHYSICIAN_SYNTHESIS", "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING"),
  tx("PHYSICIAN_CLINICAL_SYNTHESIS_PENDING", "START_PHYSICIAN_REVIEW", "PHYSICIAN_REVIEW_IN_PROGRESS", ["PHYSICIAN_SYNTHESIS_STARTED"]),
  tx("PHYSICIAN_REVIEW_IN_PROGRESS", "REQUEST_EXTERNAL_OPINION", "EXTERNAL_OPINION_REQUESTED", ["REASON_REQUIRED"], true),
  tx("EXTERNAL_OPINION_REQUESTED", "SUBMIT_EXTERNAL_OPINION", "EXTERNAL_OPINION_SUBMITTED"),
  tx("EXTERNAL_OPINION_SUBMITTED", "START_PHYSICIAN_REVIEW", "PHYSICIAN_REVIEW_IN_PROGRESS"),
  tx("PHYSICIAN_REVIEW_IN_PROGRESS", "DRAFT_FINAL_REPORT", "FINAL_REPORT_DRAFTED", ["FINAL_REPORT_DRAFTED"]),
  tx("FINAL_REPORT_DRAFTED", "DRAFT_PATIENT_SAFE_SUMMARY", "PATIENT_SAFE_SUMMARY_DRAFTED", ["PATIENT_SAFE_SUMMARY_DRAFTED"]),
  tx("PATIENT_SAFE_SUMMARY_DRAFTED", "SUBMIT_FINAL_CLINICAL_APPROVAL", "FINAL_CLINICAL_APPROVAL_PENDING", ["FINAL_CLINICAL_APPROVAL_COMPLETE"]),
  tx("FINAL_CLINICAL_APPROVAL_PENDING", "APPROVE_PUBLICATION", "PUBLICATION_APPROVED", ["PUBLICATION_APPROVED"]),
  tx("PUBLICATION_APPROVED", "PUBLISH_TO_PATIENT_PORTAL", "PUBLISHED_TO_PATIENT_PORTAL", ["PUBLICATION_APPROVED"]),
  tx("PUBLISHED_TO_PATIENT_PORTAL", "START_FOLLOW_UP_COORDINATION", "FOLLOW_UP_COORDINATION_PENDING"),
  tx("PUBLISHED_TO_PATIENT_PORTAL", "CLOSE_CASE", "CASE_CLOSED"),
  tx("FOLLOW_UP_COORDINATION_PENDING", "CLOSE_CASE", "CASE_CLOSED"),
  tx("FINAL_CLINICAL_APPROVAL_PENDING", "START_RESEARCH_ELIGIBILITY", "RESEARCH_ELIGIBILITY_PENDING"),
  tx("PUBLISHED_TO_PATIENT_PORTAL", "START_RESEARCH_ELIGIBILITY", "RESEARCH_ELIGIBILITY_PENDING"),
  tx("CASE_CLOSED", "START_RESEARCH_ELIGIBILITY", "RESEARCH_ELIGIBILITY_PENDING"),
  tx("RESEARCH_ELIGIBILITY_PENDING", "MARK_RESEARCH_ELIGIBLE", "RESEARCH_ELIGIBLE", ["RESEARCH_CONSENT_VALID"]),
  tx("RESEARCH_ELIGIBILITY_PENDING", "MARK_RESEARCH_NOT_ELIGIBLE", "RESEARCH_NOT_ELIGIBLE", ["REASON_REQUIRED"], true),
  tx("RESEARCH_ELIGIBLE", "PREPARE_DEIDENTIFIED_DATASET", "DEIDENTIFIED_DATASET_READY", ["DEIDENTIFIED_DATASET_READY"]),
  tx("DEIDENTIFIED_DATASET_READY", "APPROVE_RESEARCH_EXPORT", "RESEARCH_EXPORT_APPROVED", ["REASON_REQUIRED"], true),
];

function tx(
  from: CaseState,
  action: CaseAction,
  to: CaseState,
  guards: TransitionGuard[] = [],
  requiresReason = false,
): CaseTransition {
  return { from, action, to, guards, requiresReason, description: `${from} --${action}--> ${to}` };
}

export function canTransition(caseRecord: CaseStatefulRecord, targetState: CaseState, context: TransitionContext) {
  const transition = CASE_TRANSITIONS.find((candidate) => candidate.from === caseRecord.state && candidate.to === targetState);
  if (!transition) return { allowed: false, blockers: [blocker("INVALID_TRANSITION", `Cannot transition from ${caseRecord.state} to ${targetState}.`, CASE_STATE_DEFINITIONS[caseRecord.state].primaryOwner)] };
  const blockers = getGuardBlockers(transition, context);
  return { allowed: blockers.length === 0, blockers };
}

export function transitionCase<T extends CaseStatefulRecord>(caseRecord: T, action: CaseAction, context: TransitionContext): TransitionResult<T> {
  const timestamp = context.timestamp ?? new Date().toISOString();
  const transition = CASE_TRANSITIONS.find((candidate) => candidate.from === caseRecord.state && candidate.action === action);
  const previousState = caseRecord.state;

  if (!transition) {
    const blockers = [blocker("ACTION_NOT_ALLOWED", `${action} is not allowed from ${caseRecord.state}.`, CASE_STATE_DEFINITIONS[caseRecord.state].primaryOwner)];
    const auditEvent = createAuditEvent({
      caseId: caseRecord.id,
      actorId: context.actorId,
      actorRole: context.actorRole,
      action,
      previousState,
      nextState: previousState,
      timestamp,
      reason: context.reason,
      success: false,
      blockerCodes: blockers.map((item) => item.code),
    });
    return { success: false, caseRecord, previousState, nextState: previousState, action, actorRole: context.actorRole, timestamp, blockers, auditEvent, reason: context.reason };
  }

  const blockers = getGuardBlockers(transition, context);
  if (blockers.length) {
    const auditEvent = createAuditEvent({
      caseId: caseRecord.id,
      actorId: context.actorId,
      actorRole: context.actorRole,
      action,
      previousState,
      nextState: previousState,
      timestamp,
      reason: context.reason,
      success: false,
      blockerCodes: blockers.map((item) => item.code),
    });
    return { success: false, caseRecord, previousState, nextState: previousState, action, actorRole: context.actorRole, timestamp, blockers, auditEvent, reason: context.reason };
  }

  const auditEvent = createAuditEvent({
    caseId: caseRecord.id,
    actorId: context.actorId,
    actorRole: context.actorRole,
    action,
    previousState,
    nextState: transition.to,
    timestamp,
    reason: context.reason,
    success: true,
  });
  const updatedCase = {
    ...caseRecord,
    state: transition.to,
    blockers: [],
    auditEvents: [...(caseRecord.auditEvents ?? []), auditEvent],
  };

  return { success: true, caseRecord: updatedCase, previousState, nextState: transition.to, action, actorRole: context.actorRole, timestamp, blockers: [], auditEvent, reason: context.reason };
}

function getGuardBlockers(transition: CaseTransition, context: TransitionContext) {
  const blockers = transition.guards?.flatMap((guard) => guardSatisfied(guard, transition, context)) ?? [];
  if (transition.requiresReason && !context.reason?.trim()) {
    blockers.push(blocker("REASON_REQUIRED", "A reason is required for this transition.", CASE_STATE_DEFINITIONS[transition.from].primaryOwner));
  }
  return blockers;
}

function guardSatisfied(guard: TransitionGuard, transition: CaseTransition, context: TransitionContext): CaseBlocker[] {
  const owner = CASE_STATE_DEFINITIONS[transition.from].primaryOwner;
  const checks: Record<TransitionGuard, boolean> = {
    HAS_PATIENT_INFORMATION: Boolean(context.hasPatientInformation),
    HAS_CLINICAL_CONSENT: Boolean(context.hasClinicalConsent),
    HAS_MRI: Boolean(context.hasMri),
    MRI_INTAKE_REVIEWED: Boolean(context.mriIntakeReviewed),
    PROTOCOL_COMPLETE: Boolean(context.protocolComplete),
    IMAGE_QUALITY_ACCEPTED: Boolean(context.imageQualityAccepted),
    AI_OUTPUT_READY: Boolean(context.aiOutputReady),
    TECHNICAL_SEGMENTATION_QC_APPROVED: Boolean(context.technicalSegmentationQcApproved),
    RADIOLOGIST_OUTPUT_ACCEPTED: Boolean(context.radiologistOutputAccepted),
    STRUCTURED_VISUAL_REPORT_COMPLETE: Boolean(context.structuredVisualReportComplete),
    RADIOLOGIST_HANDOFF_COMPLETE: Boolean(context.radiologistHandoffComplete),
    PHYSICIAN_SYNTHESIS_STARTED: Boolean(context.physicianSynthesisStarted),
    FINAL_REPORT_DRAFTED: Boolean(context.finalReportDrafted),
    PATIENT_SAFE_SUMMARY_DRAFTED: Boolean(context.patientSafeSummaryDrafted),
    FINAL_CLINICAL_APPROVAL_COMPLETE: Boolean(context.finalClinicalApprovalComplete),
    PUBLICATION_APPROVED: Boolean(context.publicationApproved),
    RESEARCH_CONSENT_VALID: Boolean(context.researchConsentValid),
    DEIDENTIFIED_DATASET_READY: Boolean(context.deidentifiedDatasetReady),
    REASON_REQUIRED: Boolean(context.reason?.trim()),
  };
  return checks[guard] ? [] : [blocker(guard, guardMessage(guard), owner)];
}

function guardMessage(guard: TransitionGuard) {
  return guard.toLowerCase().replaceAll("_", " ");
}

function blocker(code: string, message: string, ownerRole: CaseOwnerRole): CaseBlocker {
  return { code, message, ownerRole, blocking: true };
}
