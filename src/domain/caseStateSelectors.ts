import { CASE_STATE_DEFINITIONS, type CaseAction, type CaseBlocker, type CaseOwnerRole, type CaseState, type PatientVisibilityLevel } from "./caseState";
import { CASE_TRANSITIONS, type CaseStatefulRecord } from "./caseTransitions";

export type CaseCompatibilityFields = {
  caseStatus: string;
  mriStatus: string;
  aiStatus: string;
  radiologistStatus: string;
  neurologistStatus: string;
  reportStatus: string;
  patientSummaryStatus: string;
  pdfReleaseStatus: string;
  releaseStatus: string;
  followUpStatus: string;
  nextAction: string;
  currentOwnerRole: OwnerRoleLabel;
};

export type OwnerRoleLabel =
  | "Operations"
  | "Radiologist"
  | "MRI Scientist / AI QA"
  | "Neurologist / Physician"
  | "Patient / Caregiver"
  | "Research"
  | "Data Steward / Research Admin"
  | "External Guest Reviewer"
  | "System";

const ownerLabels: Record<CaseOwnerRole, OwnerRoleLabel> = {
  OPERATIONS: "Operations",
  RADIOLOGIST: "Radiologist",
  MRI_SCIENTIST_AI_QA: "MRI Scientist / AI QA",
  PHYSICIAN: "Neurologist / Physician",
  PATIENT_CAREGIVER: "Patient / Caregiver",
  RESEARCHER: "Research",
  DATA_STEWARD: "Data Steward / Research Admin",
  EXTERNAL_GUEST: "External Guest Reviewer",
  SYSTEM: "System",
};

export function getAllowedActions(caseRecord: CaseStatefulRecord, role?: CaseOwnerRole): CaseAction[] {
  const definition = CASE_STATE_DEFINITIONS[caseRecord.state];
  if (!role) return definition.allowedActions;
  if (definition.primaryOwner === role || definition.supportingRoles.includes(role)) return definition.allowedActions;
  return [];
}

export function getNextPossibleStates(caseRecord: CaseStatefulRecord): CaseState[] {
  return CASE_STATE_DEFINITIONS[caseRecord.state].possibleNextStates;
}

export function getCurrentOwner(caseRecord: CaseStatefulRecord): CaseOwnerRole {
  return CASE_STATE_DEFINITIONS[caseRecord.state].primaryOwner;
}

export function getCurrentOwnerLabel(caseRecord: CaseStatefulRecord): OwnerRoleLabel {
  return ownerLabels[getCurrentOwner(caseRecord)];
}

export function getNextAction(caseRecord: CaseStatefulRecord): string {
  const definition = CASE_STATE_DEFINITIONS[caseRecord.state];
  const action = definition.allowedActions[0];
  if (!action) return isTerminalState(caseRecord.state) ? "No action required" : "Review case status";
  return actionLabels[action] ?? action;
}

export function getCaseBlockers(caseRecord: CaseStatefulRecord): CaseBlocker[] {
  const existing = caseRecord.blockers ?? [];
  if (existing.length) return existing;
  return CASE_STATE_DEFINITIONS[caseRecord.state].blockingConditions.map((condition) => ({
    code: condition.toUpperCase(),
    message: condition.replaceAll("_", " "),
    ownerRole: getCurrentOwner(caseRecord),
    blocking: true,
  }));
}

export function getPatientVisibilityForState(caseRecord: CaseStatefulRecord): PatientVisibilityLevel {
  return CASE_STATE_DEFINITIONS[caseRecord.state].patientVisibility;
}

export function isTerminalState(caseState: CaseState) {
  return CASE_STATE_DEFINITIONS[caseState].possibleNextStates.length === 0;
}

export function isClinicalReviewState(caseState: CaseState) {
  return CASE_STATE_DEFINITIONS[caseState].requiresClinicalReview;
}

export function isResearchState(caseState: CaseState) {
  return CASE_STATE_DEFINITIONS[caseState].phase === "research";
}

export function isMvpEnabledState(caseState: CaseState) {
  return CASE_STATE_DEFINITIONS[caseState].enabledInMvp;
}

export function getTransitionsFromState(caseState: CaseState) {
  return CASE_TRANSITIONS.filter((transition) => transition.from === caseState);
}

export function deriveCaseCompatibilityFields(caseRecord: CaseStatefulRecord): CaseCompatibilityFields {
  const definition = CASE_STATE_DEFINITIONS[caseRecord.state];
  const state = caseRecord.state;
  return {
    caseStatus: definition.label,
    mriStatus: deriveMriStatus(state),
    aiStatus: deriveAiStatus(state),
    radiologistStatus: deriveRadiologistStatus(state),
    neurologistStatus: derivePhysicianStatus(state),
    reportStatus: deriveReportStatus(state),
    patientSummaryStatus: derivePatientSummaryStatus(state),
    pdfReleaseStatus: derivePdfStatus(state),
    releaseStatus: deriveReleaseStatus(state),
    followUpStatus: deriveFollowUpStatus(state),
    nextAction: getNextAction(caseRecord),
    currentOwnerRole: getCurrentOwnerLabel(caseRecord),
  };
}

export function withDerivedCaseFields<T extends CaseStatefulRecord>(caseRecord: T): T & CaseCompatibilityFields {
  return {
    ...caseRecord,
    ...deriveCaseCompatibilityFields(caseRecord),
  };
}

const actionLabels: Record<CaseAction, string> = {
  CREATE_CASE: "Create case",
  REQUEST_PATIENT_INFORMATION: "Request patient information",
  COMPLETE_PATIENT_INFORMATION: "Complete patient information",
  REQUEST_CONSENT: "Request consent",
  RECORD_CONSENT: "Record consent",
  REQUEST_MRI: "Request MRI",
  RECEIVE_MRI: "Mark MRI received",
  START_MRI_INTAKE_REVIEW: "Start MRI intake review",
  COMPLETE_MRI_INTAKE_REVIEW: "Complete MRI intake review",
  COMPLETE_PROTOCOL_CHECK: "Complete protocol check",
  PASS_IMAGE_QUALITY: "Pass image quality review",
  FAIL_IMAGE_QUALITY: "Fail image quality review",
  QUEUE_AI_PROCESSING: "Queue AI processing",
  START_AI_PROCESSING: "Start AI processing",
  COMPLETE_AI_PROCESSING: "Complete AI processing",
  FAIL_AI_PROCESSING: "Mark AI processing failed",
  START_SEGMENTATION_REVIEW: "Start segmentation review",
  COMPLETE_TECHNICAL_SEGMENTATION_QC: "Complete technical segmentation QC",
  COMPLETE_QUANTITATIVE_OUTPUT_REVIEW: "Complete quantitative output review",
  COMPLETE_STRUCTURED_VISUAL_REPORT: "Complete structured visual report",
  START_RADIOLOGIST_REVIEW: "Start radiologist review",
  COMPLETE_RADIOLOGIST_REVIEW: "Complete radiologist review",
  REQUEST_REPROCESSING: "Request reprocessing",
  START_PHYSICIAN_SYNTHESIS: "Start physician clinical synthesis",
  START_PHYSICIAN_REVIEW: "Start physician review",
  REQUEST_EXTERNAL_OPINION: "Request external opinion",
  SUBMIT_EXTERNAL_OPINION: "Submit external opinion",
  DRAFT_FINAL_REPORT: "Draft final report",
  DRAFT_PATIENT_SAFE_SUMMARY: "Draft patient-safe summary",
  SUBMIT_FINAL_CLINICAL_APPROVAL: "Submit final clinical approval",
  APPROVE_PUBLICATION: "Approve publication",
  PUBLISH_TO_PATIENT_PORTAL: "Publish to patient portal",
  START_FOLLOW_UP_COORDINATION: "Start follow-up coordination",
  CLOSE_CASE: "Close case",
  START_RESEARCH_ELIGIBILITY: "Start research eligibility review",
  MARK_RESEARCH_ELIGIBLE: "Mark research eligible",
  MARK_RESEARCH_NOT_ELIGIBLE: "Mark research not eligible",
  PREPARE_DEIDENTIFIED_DATASET: "Prepare de-identified dataset",
  APPROVE_RESEARCH_EXPORT: "Approve research export",
};

function stateAtOrAfter(state: CaseState, states: CaseState[]) {
  return states.includes(state);
}

function deriveMriStatus(state: CaseState) {
  if (stateAtOrAfter(state, ["CASE_CREATED", "PATIENT_INFORMATION_PENDING", "CONSENT_PENDING", "MRI_REQUESTED"])) return state === "MRI_REQUESTED" ? "Requested" : "Missing";
  if (state === "IMAGE_QUALITY_FAILED") return "Quality issue";
  return "Received";
}

function deriveAiStatus(state: CaseState) {
  if (state === "AI_PROCESSING_PENDING") return "Pending";
  if (state === "AI_PROCESSING_IN_PROGRESS") return "Processing";
  if (state === "AI_PROCESSING_FAILED") return "Failed";
  if (state === "REPROCESSING_REQUESTED") return "Reprocessing requested";
  if (["QUANTITATIVE_OUTPUT_READY", "SEGMENTATION_REVIEW_PENDING", "QUANTITATIVE_OUTPUT_REVIEW_PENDING", "STRUCTURED_VISUAL_REPORT_PENDING", "RADIOLOGIST_REVIEW_IN_PROGRESS", "RADIOLOGIST_REVIEW_COMPLETED", "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING", "PHYSICIAN_REVIEW_IN_PROGRESS", "FINAL_REPORT_DRAFTED", "PATIENT_SAFE_SUMMARY_DRAFTED", "FINAL_CLINICAL_APPROVAL_PENDING", "PUBLICATION_APPROVED", "PUBLISHED_TO_PATIENT_PORTAL", "FOLLOW_UP_COORDINATION_PENDING", "CASE_CLOSED"].includes(state)) return "AI output ready";
  return "Not started";
}

function deriveRadiologistStatus(state: CaseState) {
  if (state === "IMAGE_QUALITY_FAILED") return "Needs quality review";
  if (["QUANTITATIVE_OUTPUT_READY", "SEGMENTATION_REVIEW_PENDING", "QUANTITATIVE_OUTPUT_REVIEW_PENDING", "STRUCTURED_VISUAL_REPORT_PENDING"].includes(state)) return "Review pending";
  if (state === "RADIOLOGIST_REVIEW_IN_PROGRESS") return "Review in progress";
  if (["RADIOLOGIST_REVIEW_COMPLETED", "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING", "PHYSICIAN_REVIEW_IN_PROGRESS", "FINAL_REPORT_DRAFTED", "PATIENT_SAFE_SUMMARY_DRAFTED", "FINAL_CLINICAL_APPROVAL_PENDING", "PUBLICATION_APPROVED", "PUBLISHED_TO_PATIENT_PORTAL", "FOLLOW_UP_COORDINATION_PENDING", "CASE_CLOSED"].includes(state)) return "Radiologist reviewed";
  if (state === "REPROCESSING_REQUESTED") return "Reprocess requested";
  return "Not ready";
}

function derivePhysicianStatus(state: CaseState) {
  if (state === "RADIOLOGIST_REVIEW_COMPLETED" || state === "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING") return "Review pending";
  if (state === "PHYSICIAN_REVIEW_IN_PROGRESS") return "Review in progress";
  if (["FINAL_REPORT_DRAFTED", "PATIENT_SAFE_SUMMARY_DRAFTED", "FINAL_CLINICAL_APPROVAL_PENDING"].includes(state)) return "Physician review in progress";
  if (["PUBLICATION_APPROVED", "PUBLISHED_TO_PATIENT_PORTAL", "FOLLOW_UP_COORDINATION_PENDING", "CASE_CLOSED"].includes(state)) return "Physician reviewed";
  return "Not ready";
}

function deriveReportStatus(state: CaseState) {
  if (["FINAL_REPORT_DRAFTED", "PATIENT_SAFE_SUMMARY_DRAFTED", "FINAL_CLINICAL_APPROVAL_PENDING"].includes(state)) return "Finalized · release approval pending";
  if (state === "PUBLICATION_APPROVED") return "Publication approved";
  if (state === "PUBLISHED_TO_PATIENT_PORTAL" || state === "FOLLOW_UP_COORDINATION_PENDING" || state === "CASE_CLOSED") return "Released";
  if (["QUANTITATIVE_OUTPUT_READY", "SEGMENTATION_REVIEW_PENDING", "QUANTITATIVE_OUTPUT_REVIEW_PENDING", "STRUCTURED_VISUAL_REPORT_PENDING", "RADIOLOGIST_REVIEW_IN_PROGRESS"].includes(state)) return "AI-generated draft";
  if (state === "RADIOLOGIST_REVIEW_COMPLETED" || state === "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING" || state === "PHYSICIAN_REVIEW_IN_PROGRESS") return "Draft";
  return "Not generated";
}

function derivePatientSummaryStatus(state: CaseState) {
  if (state === "PATIENT_SAFE_SUMMARY_DRAFTED" || state === "FINAL_CLINICAL_APPROVAL_PENDING") return "Approval required";
  if (state === "PUBLICATION_APPROVED" || state === "PUBLISHED_TO_PATIENT_PORTAL" || state === "FOLLOW_UP_COORDINATION_PENDING" || state === "CASE_CLOSED") return "Approved";
  return "Not prepared";
}

function derivePdfStatus(state: CaseState) {
  if (state === "PUBLICATION_APPROVED") return "Approved";
  if (state === "PUBLISHED_TO_PATIENT_PORTAL" || state === "FOLLOW_UP_COORDINATION_PENDING" || state === "CASE_CLOSED") return "Released";
  return "Not approved";
}

function deriveReleaseStatus(state: CaseState) {
  if (state === "PUBLICATION_APPROVED") return "Ready for release";
  if (state === "PUBLISHED_TO_PATIENT_PORTAL" || state === "FOLLOW_UP_COORDINATION_PENDING" || state === "CASE_CLOSED") return "Patient output released";
  return "Not released";
}

function deriveFollowUpStatus(state: CaseState) {
  if (state === "FOLLOW_UP_COORDINATION_PENDING") return "Coordination pending";
  if (state === "CASE_CLOSED") return "Closed";
  return "Not scheduled";
}
