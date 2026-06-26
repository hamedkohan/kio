import type { KioRole } from "./caseState";
import type { PatientSafeExclusion, PatientSafeSummaryDraft } from "./patientSafeSummary";

export type PublicationApprovalStatus =
  | "not_requested"
  | "requested"
  | "under_review"
  | "approved"
  | "rejected"
  | "returned_for_revision"
  | "superseded"
  | "voided";

export type PatientReleasePackageStatus =
  | "draft"
  | "pending_publication_approval"
  | "approved_for_release"
  | "released_to_patient_portal"
  | "withdrawn"
  | "superseded"
  | "voided";

export type PatientReleaseAttachmentType =
  | "patient_safe_summary"
  | "care_instructions"
  | "follow_up_note"
  | "rendered_pdf_placeholder";

export type PatientReleaseAttachment = {
  id: string;
  type: PatientReleaseAttachmentType;
  label: string;
  sourceId: string;
  sourceType: "patient_safe_summary_draft" | "structured_report" | "follow_up_coordination" | "rendered_pdf_placeholder";
  patientVisible: boolean;
  safeDescription: string;
};

export type PatientReleaseSafetyCheckStatus = "pending" | "passed" | "passed_with_limitations" | "failed" | "blocked";

export type PublicationApproval = {
  id: string;
  caseId: string;
  status: PublicationApprovalStatus;
  createdAt: string;
  updatedAt: string;
  requestedByRole: Extract<KioRole, "physician_neurologist" | "operations_coordinator">;
  approvedByRole?: Extract<KioRole, "physician_neurologist">;
  approvedAt?: string;
  rejectedByRole?: Extract<KioRole, "physician_neurologist">;
  rejectedAt?: string;
  sourcePhysicianSynthesisId: string;
  sourcePatientSafeSummaryDraftId: string;
  sourceStructuredReportIds: string[];
  approvalNotes?: string;
  rejectionReason?: string;
  patientVisible: boolean;
  auditEventIds: string[];
};

export type PatientReleasePackage = {
  id: string;
  caseId: string;
  status: PatientReleasePackageStatus;
  createdAt: string;
  updatedAt: string;
  publicationApprovalId: string;
  sourcePatientSafeSummaryDraftId: string;
  sourcePhysicianSynthesisId: string;
  sourceStructuredReportIds: string[];
  releaseTitle: string;
  plainLanguageSummary: string;
  whatWasReviewed: string;
  whatThisMeans: string;
  limitationsInPlainLanguage: string[];
  recommendedNextSteps: string[];
  followUpInstructions: string[];
  caregiverNotes: string[];
  excludedUnsafeContent: PatientSafeExclusion[];
  attachments: PatientReleaseAttachment[];
  patientVisible: boolean;
  caregiverVisible: boolean;
  releasedAt?: string;
  releasedByRole?: Extract<KioRole, "operations_coordinator" | "physician_neurologist">;
  withdrawnAt?: string;
  withdrawnByRole?: Extract<KioRole, "operations_coordinator" | "physician_neurologist">;
  withdrawalReason?: string;
  auditEventIds: string[];
};

export type PatientReleaseSafetyCheck = {
  id: string;
  caseId: string;
  releasePackageId: string;
  checkedAt: string;
  checkedByRole: Extract<KioRole, "physician_neurologist" | "operations_coordinator">;
  status: PatientReleaseSafetyCheckStatus;
  blockedReasons: string[];
  excludedUnsafeContent: PatientSafeExclusion[];
  safeForPatientRelease: boolean;
  notes?: string;
};

export type PatientReleasePackageDraftInput = {
  id: string;
  publicationApprovalId: string;
  summary: PatientSafeSummaryDraft;
  sourceStructuredReportIds: string[];
  releaseTitle?: string;
  createdAt: string;
  attachments?: PatientReleaseAttachment[];
};

export type PatientPortalReleaseView = {
  releasePackageId: string;
  caseId: string;
  releaseTitle: string;
  plainLanguageSummary: string;
  whatWasReviewed: string;
  whatThisMeans: string;
  limitationsInPlainLanguage: string[];
  recommendedNextSteps: string[];
  followUpInstructions: string[];
  caregiverNotes: string[];
  attachments: Array<Pick<PatientReleaseAttachment, "id" | "type" | "label" | "safeDescription">>;
  releasedAt?: string;
};

export function createPublicationApprovalRequest(input: {
  id: string;
  caseId: string;
  requestedByRole: Extract<KioRole, "physician_neurologist" | "operations_coordinator">;
  sourcePhysicianSynthesisId: string;
  sourcePatientSafeSummaryDraftId: string;
  sourceStructuredReportIds: string[];
  createdAt: string;
  approvalNotes?: string;
}): PublicationApproval {
  return {
    id: input.id,
    caseId: input.caseId,
    status: "requested",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    requestedByRole: input.requestedByRole,
    sourcePhysicianSynthesisId: input.sourcePhysicianSynthesisId,
    sourcePatientSafeSummaryDraftId: input.sourcePatientSafeSummaryDraftId,
    sourceStructuredReportIds: input.sourceStructuredReportIds,
    approvalNotes: input.approvalNotes,
    patientVisible: false,
    auditEventIds: [],
  };
}

export function approvePatientSafePublication(
  approval: PublicationApproval,
  approvedByRole: Extract<KioRole, "physician_neurologist">,
  approvedAt: string,
  approvalNotes?: string,
): PublicationApproval {
  return {
    ...approval,
    status: "approved",
    updatedAt: approvedAt,
    approvedByRole,
    approvedAt,
    approvalNotes: approvalNotes ?? approval.approvalNotes,
    patientVisible: false,
  };
}

export function rejectPatientSafePublication(
  approval: PublicationApproval,
  rejectedByRole: Extract<KioRole, "physician_neurologist">,
  rejectedAt: string,
  rejectionReason: string,
): PublicationApproval {
  return {
    ...approval,
    status: "rejected",
    updatedAt: rejectedAt,
    rejectedByRole,
    rejectedAt,
    rejectionReason,
    patientVisible: false,
  };
}

export function createPatientReleasePackageDraft(input: PatientReleasePackageDraftInput): PatientReleasePackage {
  return {
    id: input.id,
    caseId: input.summary.caseId,
    status: "pending_publication_approval",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    publicationApprovalId: input.publicationApprovalId,
    sourcePatientSafeSummaryDraftId: input.summary.id,
    sourcePhysicianSynthesisId: input.summary.physicianSynthesisId,
    sourceStructuredReportIds: input.sourceStructuredReportIds,
    releaseTitle: input.releaseTitle ?? "Specialist-reviewed summary",
    plainLanguageSummary: input.summary.plainLanguageSummary,
    whatWasReviewed: input.summary.whatWasReviewed,
    whatThisMeans: input.summary.whatThisMeans,
    limitationsInPlainLanguage: input.summary.limitationsInPlainLanguage,
    recommendedNextSteps: input.summary.recommendedNextSteps,
    followUpInstructions: input.summary.followUpInstructions,
    caregiverNotes: input.summary.caregiverNotes,
    excludedUnsafeContent: input.summary.excludedUnsafeContent,
    attachments: input.attachments ?? [],
    patientVisible: false,
    caregiverVisible: false,
    auditEventIds: [],
  };
}

export function createPatientReleaseSafetyCheck(input: {
  id: string;
  caseId: string;
  releasePackageId: string;
  checkedAt: string;
  checkedByRole: Extract<KioRole, "physician_neurologist" | "operations_coordinator">;
  excludedUnsafeContent: PatientSafeExclusion[];
  blockedReasons?: string[];
  notes?: string;
}): PatientReleaseSafetyCheck {
  const blockedReasons = input.blockedReasons ?? [];
  return {
    id: input.id,
    caseId: input.caseId,
    releasePackageId: input.releasePackageId,
    checkedAt: input.checkedAt,
    checkedByRole: input.checkedByRole,
    status: blockedReasons.length ? "blocked" : "passed",
    blockedReasons,
    excludedUnsafeContent: input.excludedUnsafeContent,
    safeForPatientRelease: blockedReasons.length === 0,
    notes: input.notes,
  };
}

export function createReleasedPatientPortalPackage(
  releasePackage: PatientReleasePackage,
  approval: PublicationApproval,
  safetyCheck: PatientReleaseSafetyCheck,
  releasedByRole: Extract<KioRole, "operations_coordinator" | "physician_neurologist">,
  releasedAt: string,
): PatientReleasePackage {
  if (approval.status !== "approved" || !safetyCheck.safeForPatientRelease) {
    return {
      ...releasePackage,
      status: "pending_publication_approval",
      patientVisible: false,
      caregiverVisible: false,
    };
  }

  return {
    ...releasePackage,
    status: "released_to_patient_portal",
    updatedAt: releasedAt,
    releasedAt,
    releasedByRole,
    patientVisible: true,
    caregiverVisible: releasePackage.caregiverVisible,
  };
}
