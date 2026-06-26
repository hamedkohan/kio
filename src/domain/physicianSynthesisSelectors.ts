import type { PatientSafeExclusion, PatientSafeSummaryDraft, PatientSafeSummaryPreview } from "./patientSafeSummary";
import type { PhysicianClinicalSynthesis, PhysicianEvidenceReview } from "./physicianSynthesis";
import type { ReportEvidenceReference } from "./reportEvidence";
import type { StructuredReport } from "./structuredReports";

export function getPhysicianSynthesesForCase(caseId: string, syntheses: PhysicianClinicalSynthesis[]) {
  return syntheses.filter((synthesis) => synthesis.caseId === caseId);
}

export function getLatestPhysicianSynthesisForCase(caseId: string, syntheses: PhysicianClinicalSynthesis[]) {
  return getPhysicianSynthesesForCase(caseId, syntheses)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function getPhysicianEvidenceReviewForCase(caseId: string, reviews: PhysicianEvidenceReview[]) {
  return reviews.find((review) => review.caseId === caseId);
}

export function getPatientSafeSummaryDraftForCase(caseId: string, summaries: PatientSafeSummaryDraft[]) {
  return summaries.find((summary) => summary.caseId === caseId);
}

export function isPhysicianSynthesisReadyForFinalApproval(synthesis?: PhysicianClinicalSynthesis) {
  return Boolean(synthesis && synthesis.status === "ready_for_final_approval" && synthesis.suitableForFinalApproval);
}

export function isPatientSafeSummaryReadyForPublicationReview(summary?: PatientSafeSummaryDraft) {
  return Boolean(summary && summary.status === "ready_for_publication_review" && summary.readyForPublicationReview && !summary.patientVisible);
}

export function getPhysicianSynthesisSourceReports(synthesis: PhysicianClinicalSynthesis, reports: StructuredReport[]) {
  return reports.filter((report) => synthesis.sourceReportIds.includes(report.id));
}

export function getPhysicianSynthesisEvidenceReferences(
  synthesis: PhysicianClinicalSynthesis,
  reports: StructuredReport[],
): ReportEvidenceReference[] {
  return getPhysicianSynthesisSourceReports(synthesis, reports)
    .flatMap((report) => report.evidenceReferences)
    .filter((reference) => synthesis.sourceEvidenceReferenceIds.length === 0 || synthesis.sourceEvidenceReferenceIds.includes(reference.id));
}

export function getPatientSafeSummaryPreview(summary?: PatientSafeSummaryDraft): PatientSafeSummaryPreview | undefined {
  if (!summary) return undefined;
  return {
    id: summary.id,
    caseId: summary.caseId,
    status: summary.status,
    plainLanguageSummary: summary.plainLanguageSummary,
    whatWasReviewed: summary.whatWasReviewed,
    whatThisMeans: summary.whatThisMeans,
    limitationsInPlainLanguage: summary.limitationsInPlainLanguage,
    recommendedNextSteps: summary.recommendedNextSteps,
    followUpInstructions: summary.followUpInstructions,
    readyForPublicationReview: summary.readyForPublicationReview,
    patientVisible: false,
  };
}

export function getPatientSafeExcludedContent(summary?: PatientSafeSummaryDraft): PatientSafeExclusion[] {
  return summary?.excludedUnsafeContent ?? [];
}

export function canUseSynthesisForPublicationPlaceholder(
  synthesis?: PhysicianClinicalSynthesis,
  summary?: PatientSafeSummaryDraft,
) {
  return Boolean(
    synthesis &&
      summary &&
      synthesis.patientSafeSummaryDraftId === summary.id &&
      synthesis.status === "ready_for_final_approval" &&
      summary.status === "ready_for_publication_review" &&
      synthesis.suitableForFinalApproval &&
      summary.readyForPublicationReview &&
      !summary.patientVisible,
  );
}
