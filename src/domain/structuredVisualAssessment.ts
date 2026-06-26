import type { KioRole } from "./caseState";
import type { VisualRatingScore, VisualSeverity } from "./visualRatingScales";

export type StructuredVisualAssessmentStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "completed_with_limitations"
  | "blocked_by_image_quality"
  | "blocked_by_missing_protocol"
  | "requires_rescan";

export type AtrophyFindings = {
  globalCorticalAtrophy: VisualSeverity;
  medialTemporalAtrophy: VisualSeverity;
  frontalAtrophy: VisualSeverity;
  parietalPosteriorAtrophy: VisualSeverity;
  temporalAtrophy: VisualSeverity;
  asymmetry: "none" | "left_greater" | "right_greater" | "present_not_lateralized" | "not_assessed";
  cerebellarBrainstemComment?: string;
};

export type VascularWhiteMatterFindings = {
  whiteMatterHyperintensities: VisualSeverity;
  smallVesselDisease: VisualSeverity;
  lacunarInfarcts: "absent" | "present" | "not_assessed" | "limited_by_quality";
  strategicInfarcts: "absent" | "present" | "not_assessed" | "limited_by_quality";
  chronicInfarcts: "absent" | "present" | "not_assessed" | "limited_by_quality";
  enlargedPerivascularSpaces: VisualSeverity;
  vascularBurdenSummary: string;
  fazekasScoreReference?: string;
};

export type DiffusionFindings = {
  acuteDiffusionRestriction: "absent" | "present" | "not_assessed" | "limited_by_quality";
  dwiAdcAdequacy: "adequate" | "limited" | "not_available";
  acuteInfarctFlag: boolean;
  limitationNotes: string[];
};

export type SusceptibilityFindings = {
  microbleeds: "absent" | "present" | "not_assessed" | "limited_by_quality";
  superficialSiderosis: "absent" | "present" | "not_assessed" | "limited_by_quality";
  priorHemorrhageFlag: boolean;
  swiT2StarAdequacy: "adequate" | "limited" | "not_available";
  limitationNotes: string[];
};

export type HydrocephalusNphFindings = {
  ventriculomegalyFlag: boolean;
  disproportionateCsfSpacesFlag: boolean;
  nphConcernFlag: boolean;
  limitationNotes: string[];
};

export type IncidentalFinding = {
  label: string;
  severity: "minor" | "requires_follow_up" | "urgent" | "not_assessed";
  notes?: string;
};

export type StructuredVisualAssessment = {
  id: string;
  caseId: string;
  mriStudyId: string;
  radiologistReviewId: string;
  status: StructuredVisualAssessmentStatus;
  createdAt: string;
  updatedAt: string;
  assessedByRole: Extract<KioRole, "radiologist" | "neuroradiologist">;
  assessedAt?: string;
  protocolCompletenessAssessmentId: string;
  imageQualityAssessmentId: string;
  visualScores: VisualRatingScore[];
  atrophyFindings: AtrophyFindings;
  vascularFindings: VascularWhiteMatterFindings;
  diffusionFindings: DiffusionFindings;
  susceptibilityFindings: SusceptibilityFindings;
  hydrocephalusFindings: HydrocephalusNphFindings;
  incidentalFindings: IncidentalFinding[];
  limitations: string[];
  radiologistImpression: string;
  handoffNote: string;
  suitableForPhysicianHandoff: boolean;
  patientVisible: boolean;
  researchEligible: boolean;
};

export function isStructuredVisualAssessmentComplete(assessment?: StructuredVisualAssessment) {
  return Boolean(
    assessment &&
      ["completed", "completed_with_limitations"].includes(assessment.status) &&
      assessment.suitableForPhysicianHandoff,
  );
}

export function isStructuredVisualAssessmentBlocked(assessment?: StructuredVisualAssessment) {
  return Boolean(
    assessment &&
      ["blocked_by_image_quality", "blocked_by_missing_protocol", "requires_rescan"].includes(assessment.status),
  );
}
