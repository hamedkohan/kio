import type { KioCase } from "../types";
import { canPerformCaseAction, type AccessContext } from "./permissions";
import type { PatientSafeSummaryDraft } from "./patientSafeSummary";
import {
  approvePatientSafePublication,
  createReleasedPatientPortalPackage,
  rejectPatientSafePublication,
  type PatientReleasePackage,
  type PatientReleaseSafetyCheck,
  type PublicationApproval,
} from "./publication";
import {
  isPublicationApproved,
  isReleasePackagePatientVisible,
  isReleaseSafeForPatient,
} from "./publicationSelectors";
import { normalizeRoleId } from "./roles";

export type PublicationActionDecision = {
  allowed: boolean;
  reason?: string;
};

export type PublicationActionResult = PublicationActionDecision & {
  approval?: PublicationApproval;
  releasePackage?: PatientReleasePackage;
};

export function canRequestPublicationApproval(
  caseRecord: KioCase,
  summaryDraft: PatientSafeSummaryDraft | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "physician_neurologist") return deny("Only the Physician / Neurologist can request patient-safe publication approval.");
  if (!summaryDraft) return deny("Patient-safe summary draft is missing.");
  if (!summaryDraft.readyForPublicationReview || summaryDraft.patientVisible) return deny("Patient-safe summary draft is not ready for publication review.");
  const decision = canPerformCaseAction(caseRecord, "SUBMIT_FINAL_CLINICAL_APPROVAL", context);
  return decision.allowed ? allow() : deny(decision.reason ?? "Final clinical approval is not available in the current case state.");
}

export function canApprovePatientSafePublication(
  caseRecord: KioCase,
  approval: PublicationApproval | undefined,
  summaryDraft: PatientSafeSummaryDraft | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "physician_neurologist") return deny("Only the Physician / Neurologist can approve patient-safe publication.");
  if (!approval) return deny("Publication approval request is missing.");
  if (!summaryDraft) return deny("Patient-safe summary draft is missing.");
  if (approval.sourcePatientSafeSummaryDraftId !== summaryDraft.id) return deny("Publication approval does not match the patient-safe summary draft.");
  if (!summaryDraft.readyForPublicationReview || summaryDraft.patientVisible) return deny("Patient-safe summary draft is not ready for publication approval.");
  if (!["requested", "under_review"].includes(approval.status)) return deny("Publication approval is not in an approvable state.");
  const decision = canPerformCaseAction(caseRecord, "APPROVE_PUBLICATION", context);
  return decision.allowed ? allow() : deny(decision.reason ?? "Publication approval is not available in the current case state.");
}

export function canRejectPublication(
  _caseRecord: KioCase,
  approval: PublicationApproval | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "physician_neurologist") return deny("Only the Physician / Neurologist can return or reject patient-safe publication.");
  if (!approval) return deny("Publication approval request is missing.");
  if (!["requested", "under_review"].includes(approval.status)) return deny("Publication approval is not in a rejectable state.");
  return allow();
}

export function canCreateReleasePackage(
  approval: PublicationApproval | undefined,
  summaryDraft: PatientSafeSummaryDraft | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "physician_neurologist") return deny("Only the Physician / Neurologist can create patient-safe release package drafts.");
  if (!approval || !isPublicationApproved(approval)) return deny("Publication must be approved before a release package can be created.");
  if (!summaryDraft || approval.sourcePatientSafeSummaryDraftId !== summaryDraft.id) return deny("Patient-safe summary draft does not match the approved publication.");
  return allow();
}

export function canOperationsCoordinateApprovedRelease(
  caseRecord: KioCase,
  approval: PublicationApproval | undefined,
  releasePackage: PatientReleasePackage | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "operations_coordinator") return deny("Only Operations can coordinate release after physician approval.");
  if (!approval || !isPublicationApproved(approval)) return deny("Physician publication approval is required before Operations can coordinate release.");
  if (!releasePackage) return deny("Patient-safe release package is missing.");
  if (releasePackage.publicationApprovalId !== approval.id) return deny("Release package does not match the latest publication approval.");
  const decision = canPerformCaseAction(caseRecord, "PUBLISH_TO_PATIENT_PORTAL", context);
  return decision.allowed ? allow() : deny(decision.reason ?? "Patient portal publication is not available in the current case state.");
}

export function canReleasePackageToPatientPortal(
  caseRecord: KioCase,
  approval: PublicationApproval | undefined,
  releasePackage: PatientReleasePackage | undefined,
  safetyCheck: PatientReleaseSafetyCheck | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const coordinateDecision = canOperationsCoordinateApprovedRelease(caseRecord, approval, releasePackage, context);
  if (!coordinateDecision.allowed) return coordinateDecision;
  if (!isReleaseSafeForPatient(releasePackage, safetyCheck)) return deny("Release safety check must pass before patient portal release.");
  if (releasePackage?.status !== "approved_for_release" && releasePackage?.status !== "released_to_patient_portal") return deny("Release package must be approved for release before publication.");
  return allow();
}

export function canWithdrawPatientRelease(
  releasePackage: PatientReleasePackage | undefined,
  context: AccessContext,
): PublicationActionDecision {
  const role = normalizeRoleId(context.role);
  if (role !== "operations_coordinator" && role !== "physician_neurologist") return deny("Only Operations or Physician can withdraw a patient release.");
  if (!releasePackage || !isReleasePackagePatientVisible(releasePackage)) return deny("Only a released patient-visible package can be withdrawn.");
  return allow();
}

export function getPublicationActionAvailability(input: {
  caseRecord: KioCase;
  approval?: PublicationApproval;
  releasePackage?: PatientReleasePackage;
  safetyCheck?: PatientReleaseSafetyCheck;
  summaryDraft?: PatientSafeSummaryDraft;
  context: AccessContext;
}) {
  return {
    requestPublicationApproval: canRequestPublicationApproval(input.caseRecord, input.summaryDraft, input.context),
    approvePublication: canApprovePatientSafePublication(input.caseRecord, input.approval, input.summaryDraft, input.context),
    createReleasePackage: canCreateReleasePackage(input.approval, input.summaryDraft, input.context),
    releaseToPatientPortal: canReleasePackageToPatientPortal(input.caseRecord, input.approval, input.releasePackage, input.safetyCheck, input.context),
    withdrawRelease: canWithdrawPatientRelease(input.releasePackage, input.context),
  };
}

export function getPublicationDeniedReason(decision: PublicationActionDecision) {
  return decision.allowed ? undefined : decision.reason ?? "Publication action is not allowed.";
}

export function applyPublicationApprovalAction(input: {
  caseRecord: KioCase;
  approval?: PublicationApproval;
  summaryDraft?: PatientSafeSummaryDraft;
  context: AccessContext;
  approvedAt: string;
  approvalNotes?: string;
}): PublicationActionResult {
  const decision = canApprovePatientSafePublication(input.caseRecord, input.approval, input.summaryDraft, input.context);
  if (!decision.allowed) return decision;
  return {
    allowed: true,
    approval: approvePatientSafePublication(input.approval as PublicationApproval, "physician_neurologist", input.approvedAt, input.approvalNotes),
  };
}

export function applyPublicationRejectionAction(input: {
  caseRecord: KioCase;
  approval?: PublicationApproval;
  context: AccessContext;
  rejectedAt: string;
  rejectionReason: string;
}): PublicationActionResult {
  const decision = canRejectPublication(input.caseRecord, input.approval, input.context);
  if (!decision.allowed) return decision;
  return {
    allowed: true,
    approval: rejectPatientSafePublication(input.approval as PublicationApproval, "physician_neurologist", input.rejectedAt, input.rejectionReason),
  };
}

export function applyPatientReleaseAction(input: {
  caseRecord: KioCase;
  approval?: PublicationApproval;
  releasePackage?: PatientReleasePackage;
  safetyCheck?: PatientReleaseSafetyCheck;
  context: AccessContext;
  releasedAt: string;
}): PublicationActionResult {
  const decision = canReleasePackageToPatientPortal(input.caseRecord, input.approval, input.releasePackage, input.safetyCheck, input.context);
  if (!decision.allowed) return decision;
  return {
    allowed: true,
    releasePackage: createReleasedPatientPortalPackage(input.releasePackage as PatientReleasePackage, input.approval as PublicationApproval, input.safetyCheck as PatientReleaseSafetyCheck, "operations_coordinator", input.releasedAt),
  };
}

function allow(): PublicationActionDecision {
  return { allowed: true };
}

function deny(reason: string): PublicationActionDecision {
  return { allowed: false, reason };
}
