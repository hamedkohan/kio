import type { KioRole } from "./caseState";

export type ProtocolCompletenessStatus =
  | "not_started"
  | "pending"
  | "complete"
  | "complete_with_limitations"
  | "incomplete"
  | "failed";

export type ProtocolCompletenessAssessment = {
  id: string;
  caseId: string;
  mriStudyId: string;
  assessedByRole: Extract<KioRole, "radiologist" | "neuroradiologist" | "mri_scientist_ai_qa">;
  assessedAt?: string;
  status: ProtocolCompletenessStatus;
  requiredSequences: string[];
  availableSequences: string[];
  missingSequences: string[];
  optionalSequences: string[];
  limitations: string[];
  suitableForVisualAssessment: boolean;
  suitableForQuantitativeProcessing: boolean;
  notes?: string;
};

export function isProtocolCompleteForVisualAssessment(assessment?: ProtocolCompletenessAssessment) {
  return Boolean(
    assessment &&
      ["complete", "complete_with_limitations"].includes(assessment.status) &&
      assessment.suitableForVisualAssessment,
  );
}
