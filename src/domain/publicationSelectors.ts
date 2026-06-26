import type {
  PatientPortalReleaseView,
  PatientReleasePackage,
  PatientReleaseSafetyCheck,
  PublicationApproval,
} from "./publication";

export function getPublicationApprovalsForCase(caseId: string, approvals: PublicationApproval[]) {
  return approvals.filter((approval) => approval.caseId === caseId);
}

export function getLatestPublicationApprovalForCase(caseId: string, approvals: PublicationApproval[]) {
  return getPublicationApprovalsForCase(caseId, approvals)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function getPatientReleasePackagesForCase(caseId: string, packages: PatientReleasePackage[]) {
  return packages.filter((releasePackage) => releasePackage.caseId === caseId);
}

export function getLatestPatientReleasePackageForCase(caseId: string, packages: PatientReleasePackage[]) {
  return getPatientReleasePackagesForCase(caseId, packages)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function isPublicationApproved(approval?: PublicationApproval) {
  return Boolean(approval && approval.status === "approved" && approval.approvedByRole === "physician_neurologist");
}

export function isReleasePackagePatientVisible(releasePackage?: PatientReleasePackage) {
  return Boolean(releasePackage && releasePackage.status === "released_to_patient_portal" && releasePackage.patientVisible);
}

export function isReleasePackageCaregiverVisible(releasePackage?: PatientReleasePackage) {
  return Boolean(releasePackage && releasePackage.status === "released_to_patient_portal" && releasePackage.caregiverVisible);
}

export function getReleaseSafetyCheckForPackage(packageId: string, checks: PatientReleaseSafetyCheck[]) {
  return checks.find((check) => check.releasePackageId === packageId);
}

export function isReleaseSafeForPatient(releasePackage?: PatientReleasePackage, safetyCheck?: PatientReleaseSafetyCheck) {
  return Boolean(
    releasePackage &&
      safetyCheck &&
      safetyCheck.releasePackageId === releasePackage.id &&
      safetyCheck.safeForPatientRelease &&
      ["passed", "passed_with_limitations"].includes(safetyCheck.status),
  );
}

export function getReleaseBlockedReasons(releasePackage?: PatientReleasePackage, safetyCheck?: PatientReleaseSafetyCheck) {
  if (!releasePackage) return ["Release package is missing."];
  if (!safetyCheck) return ["Release safety check is missing."];
  if (!isReleaseSafeForPatient(releasePackage, safetyCheck)) return safetyCheck.blockedReasons.length ? safetyCheck.blockedReasons : ["Release safety check did not pass."];
  return [];
}

export function getExcludedUnsafeContentForRelease(releasePackage?: PatientReleasePackage) {
  return releasePackage?.excludedUnsafeContent ?? [];
}

export function getPatientPortalReleaseView(
  caseId: string,
  packages: PatientReleasePackage[],
  approvals: PublicationApproval[],
  checks: PatientReleaseSafetyCheck[] = [],
): PatientPortalReleaseView | undefined {
  const approval = getLatestPublicationApprovalForCase(caseId, approvals);
  const releasePackage = getLatestPatientReleasePackageForCase(caseId, packages);
  const safetyCheck = releasePackage ? getReleaseSafetyCheckForPackage(releasePackage.id, checks) : undefined;
  if (!isPublicationApproved(approval)) return undefined;
  if (!isReleasePackagePatientVisible(releasePackage)) return undefined;
  if (!isReleaseSafeForPatient(releasePackage, safetyCheck)) return undefined;
  return toPatientPortalReleaseView(releasePackage);
}

export function getCaregiverPortalReleaseView(
  caseId: string,
  packages: PatientReleasePackage[],
  approvals: PublicationApproval[],
  checks: PatientReleaseSafetyCheck[] = [],
): PatientPortalReleaseView | undefined {
  const approval = getLatestPublicationApprovalForCase(caseId, approvals);
  const releasePackage = getLatestPatientReleasePackageForCase(caseId, packages);
  const safetyCheck = releasePackage ? getReleaseSafetyCheckForPackage(releasePackage.id, checks) : undefined;
  if (!isPublicationApproved(approval)) return undefined;
  if (!isReleasePackageCaregiverVisible(releasePackage)) return undefined;
  if (!isReleaseSafeForPatient(releasePackage, safetyCheck)) return undefined;
  return toPatientPortalReleaseView(releasePackage);
}

function toPatientPortalReleaseView(releasePackage: PatientReleasePackage): PatientPortalReleaseView {
  return {
    releasePackageId: releasePackage.id,
    caseId: releasePackage.caseId,
    releaseTitle: releasePackage.releaseTitle,
    plainLanguageSummary: releasePackage.plainLanguageSummary,
    whatWasReviewed: releasePackage.whatWasReviewed,
    whatThisMeans: releasePackage.whatThisMeans,
    limitationsInPlainLanguage: releasePackage.limitationsInPlainLanguage,
    recommendedNextSteps: releasePackage.recommendedNextSteps,
    followUpInstructions: releasePackage.followUpInstructions,
    caregiverNotes: releasePackage.caregiverNotes,
    attachments: releasePackage.attachments
      .filter((attachment) => attachment.patientVisible)
      .map((attachment) => ({
        id: attachment.id,
        type: attachment.type,
        label: attachment.label,
        safeDescription: attachment.safeDescription,
      })),
    releasedAt: releasePackage.releasedAt,
  };
}
