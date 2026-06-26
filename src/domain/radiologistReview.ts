import type { KioRole } from "./caseState";

export type RadiologistHandoffStatus =
  | "draft"
  | "ready_for_physician_review"
  | "completed"
  | "blocked"
  | "superseded";

export type RadiologistImagingHandoff = {
  id: string;
  caseId: string;
  structuredVisualAssessmentId: string;
  biomarkerOutputIds: string[];
  status: RadiologistHandoffStatus;
  createdByRole: Extract<KioRole, "radiologist" | "neuroradiologist">;
  createdAt: string;
  imagingSummary: string;
  limitations: string[];
  openQuestions: string[];
  recommendedNextStep: string;
  suitableForPhysicianReview: boolean;
  patientVisible: boolean;
};

export function isRadiologistHandoffComplete(handoff?: RadiologistImagingHandoff) {
  return Boolean(handoff && ["ready_for_physician_review", "completed"].includes(handoff.status) && handoff.suitableForPhysicianReview);
}
