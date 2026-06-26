import type { ImageQualityAssessment } from "./imageQc";
import { isImageQualityAcceptableForReview } from "./imageQc";
import type { ProtocolCompletenessAssessment } from "./protocolCompleteness";
import { isProtocolCompleteForVisualAssessment } from "./protocolCompleteness";
import type { RadiologistImagingHandoff } from "./radiologistReview";
import { isRadiologistHandoffComplete } from "./radiologistReview";
import type { StructuredVisualAssessment } from "./structuredVisualAssessment";
import {
  isStructuredVisualAssessmentBlocked,
  isStructuredVisualAssessmentComplete,
} from "./structuredVisualAssessment";
import type { VisualRatingScore } from "./visualRatingScales";

export type PhysicianVisibleStructuredSummary = {
  caseId: string;
  status: string;
  imagingSummary?: string;
  radiologistImpression?: string;
  handoffNote?: string;
  limitations: string[];
  visualScoreCount: number;
  atrophySummary?: string;
  vascularSummary?: string;
  diffusionSummary?: string;
  susceptibilitySummary?: string;
  hydrocephalusSummary?: string;
  suitableForPhysicianReview: boolean;
  decisionSupportOnly: true;
};

export type PatientSafeStructuredAssessmentSummary = {
  caseId: string;
  visible: false;
  safeMessage?: string;
};

export function getStructuredVisualAssessmentForCase(caseId: string, assessments: StructuredVisualAssessment[]) {
  return assessments.find((assessment) => assessment.caseId === caseId);
}

export function getProtocolCompletenessForCase(caseId: string, protocolAssessments: ProtocolCompletenessAssessment[]) {
  return protocolAssessments.find((assessment) => assessment.caseId === caseId);
}

export function getImageQualityAssessmentForCase(caseId: string, imageQualityAssessments: ImageQualityAssessment[]) {
  return imageQualityAssessments.find((assessment) => assessment.caseId === caseId);
}

export function getVisualScoresForCase(caseId: string, assessments: StructuredVisualAssessment[]): VisualRatingScore[] {
  return getStructuredVisualAssessmentForCase(caseId, assessments)?.visualScores ?? [];
}

export function getRadiologistHandoffForCase(caseId: string, handoffs: RadiologistImagingHandoff[]) {
  return handoffs.find((handoff) => handoff.caseId === caseId);
}

export { isStructuredVisualAssessmentComplete as isStructuredAssessmentComplete };

export { isStructuredVisualAssessmentBlocked as isStructuredAssessmentBlocked };

export function isAssessmentSuitableForPhysicianHandoff(assessment?: StructuredVisualAssessment) {
  return isStructuredVisualAssessmentComplete(assessment);
}

export function getPhysicianVisibleStructuredSummary(
  caseId: string,
  assessments: StructuredVisualAssessment[],
  handoffs: RadiologistImagingHandoff[],
): PhysicianVisibleStructuredSummary {
  const assessment = getStructuredVisualAssessmentForCase(caseId, assessments);
  const handoff = getRadiologistHandoffForCase(caseId, handoffs);
  const suitable = isStructuredVisualAssessmentComplete(assessment) && isRadiologistHandoffComplete(handoff);

  if (!assessment || !handoff || !suitable) {
    return {
      caseId,
      status: assessment?.status ?? "not_started",
      limitations: assessment?.limitations ?? [],
      visualScoreCount: 0,
      suitableForPhysicianReview: false,
      decisionSupportOnly: true,
    };
  }

  return {
    caseId,
    status: assessment.status,
    imagingSummary: handoff.imagingSummary,
    radiologistImpression: assessment.radiologistImpression,
    handoffNote: assessment.handoffNote,
    limitations: [...assessment.limitations, ...handoff.limitations],
    visualScoreCount: assessment.visualScores.filter((score) => score.completed).length,
    atrophySummary: summarizeAtrophy(assessment),
    vascularSummary: assessment.vascularFindings.vascularBurdenSummary,
    diffusionSummary: assessment.diffusionFindings.acuteInfarctFlag ? "Acute diffusion finding flagged for clinical review." : "No acute diffusion restriction flagged in structured review.",
    susceptibilitySummary: assessment.susceptibilityFindings.microbleeds === "present" ? "Susceptibility finding present; see radiologist limitations." : "No susceptibility blocker flagged in structured review.",
    hydrocephalusSummary: assessment.hydrocephalusFindings.nphConcernFlag ? "NPH-related imaging concern flagged for clinical context." : "No NPH concern flag in structured review.",
    suitableForPhysicianReview: true,
    decisionSupportOnly: true,
  };
}

export function getPatientSafeStructuredAssessmentSummary(
  caseId: string,
  _assessments: StructuredVisualAssessment[],
): PatientSafeStructuredAssessmentSummary {
  return {
    caseId,
    visible: false,
    safeMessage: "Structured imaging review details are not patient-visible in this prototype.",
  };
}

export function isVisualReadinessSatisfied(
  protocolAssessment?: ProtocolCompletenessAssessment,
  qualityAssessment?: ImageQualityAssessment,
) {
  return isProtocolCompleteForVisualAssessment(protocolAssessment) && isImageQualityAcceptableForReview(qualityAssessment);
}

function summarizeAtrophy(assessment: StructuredVisualAssessment) {
  const { atrophyFindings } = assessment;
  return [
    `Global cortical atrophy: ${atrophyFindings.globalCorticalAtrophy}`,
    `Medial temporal atrophy: ${atrophyFindings.medialTemporalAtrophy}`,
    `Posterior/parietal atrophy: ${atrophyFindings.parietalPosteriorAtrophy}`,
  ].join("; ");
}
