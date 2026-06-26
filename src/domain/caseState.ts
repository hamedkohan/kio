export const CASE_STATES = {
  CASE_CREATED: "CASE_CREATED",
  PATIENT_INFORMATION_PENDING: "PATIENT_INFORMATION_PENDING",
  CONSENT_PENDING: "CONSENT_PENDING",
  MRI_REQUESTED: "MRI_REQUESTED",
  MRI_RECEIVED: "MRI_RECEIVED",
  MRI_INTAKE_REVIEW_PENDING: "MRI_INTAKE_REVIEW_PENDING",
  PROTOCOL_COMPLETENESS_CHECK_PENDING: "PROTOCOL_COMPLETENESS_CHECK_PENDING",
  IMAGE_QUALITY_REVIEW_PENDING: "IMAGE_QUALITY_REVIEW_PENDING",
  IMAGE_QUALITY_FAILED: "IMAGE_QUALITY_FAILED",
  IMAGE_QUALITY_PASSED: "IMAGE_QUALITY_PASSED",
  AI_PROCESSING_PENDING: "AI_PROCESSING_PENDING",
  AI_PROCESSING_IN_PROGRESS: "AI_PROCESSING_IN_PROGRESS",
  AI_PROCESSING_FAILED: "AI_PROCESSING_FAILED",
  QUANTITATIVE_OUTPUT_READY: "QUANTITATIVE_OUTPUT_READY",
  SEGMENTATION_REVIEW_PENDING: "SEGMENTATION_REVIEW_PENDING",
  QUANTITATIVE_OUTPUT_REVIEW_PENDING: "QUANTITATIVE_OUTPUT_REVIEW_PENDING",
  STRUCTURED_VISUAL_REPORT_PENDING: "STRUCTURED_VISUAL_REPORT_PENDING",
  RADIOLOGIST_REVIEW_IN_PROGRESS: "RADIOLOGIST_REVIEW_IN_PROGRESS",
  RADIOLOGIST_REVIEW_COMPLETED: "RADIOLOGIST_REVIEW_COMPLETED",
  REPROCESSING_REQUESTED: "REPROCESSING_REQUESTED",
  PHYSICIAN_CLINICAL_SYNTHESIS_PENDING: "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING",
  PHYSICIAN_REVIEW_IN_PROGRESS: "PHYSICIAN_REVIEW_IN_PROGRESS",
  EXTERNAL_OPINION_REQUESTED: "EXTERNAL_OPINION_REQUESTED",
  EXTERNAL_OPINION_SUBMITTED: "EXTERNAL_OPINION_SUBMITTED",
  FINAL_REPORT_DRAFTED: "FINAL_REPORT_DRAFTED",
  PATIENT_SAFE_SUMMARY_DRAFTED: "PATIENT_SAFE_SUMMARY_DRAFTED",
  FINAL_CLINICAL_APPROVAL_PENDING: "FINAL_CLINICAL_APPROVAL_PENDING",
  PUBLICATION_APPROVED: "PUBLICATION_APPROVED",
  PUBLISHED_TO_PATIENT_PORTAL: "PUBLISHED_TO_PATIENT_PORTAL",
  FOLLOW_UP_COORDINATION_PENDING: "FOLLOW_UP_COORDINATION_PENDING",
  CASE_CLOSED: "CASE_CLOSED",
  RESEARCH_ELIGIBILITY_PENDING: "RESEARCH_ELIGIBILITY_PENDING",
  RESEARCH_ELIGIBLE: "RESEARCH_ELIGIBLE",
  RESEARCH_NOT_ELIGIBLE: "RESEARCH_NOT_ELIGIBLE",
  DEIDENTIFIED_DATASET_READY: "DEIDENTIFIED_DATASET_READY",
  RESEARCH_EXPORT_APPROVED: "RESEARCH_EXPORT_APPROVED",
} as const;

export type CaseState = typeof CASE_STATES[keyof typeof CASE_STATES];

export type CasePhase =
  | "case_initiation"
  | "mri_intake"
  | "imaging_readiness"
  | "ai_processing"
  | "ai_validation"
  | "radiologist_review"
  | "physician_review"
  | "publication"
  | "follow_up_closure"
  | "research";

export type CaseAction =
  | "CREATE_CASE"
  | "REQUEST_PATIENT_INFORMATION"
  | "COMPLETE_PATIENT_INFORMATION"
  | "REQUEST_CONSENT"
  | "RECORD_CONSENT"
  | "REQUEST_MRI"
  | "RECEIVE_MRI"
  | "START_MRI_INTAKE_REVIEW"
  | "COMPLETE_MRI_INTAKE_REVIEW"
  | "COMPLETE_PROTOCOL_CHECK"
  | "PASS_IMAGE_QUALITY"
  | "FAIL_IMAGE_QUALITY"
  | "QUEUE_AI_PROCESSING"
  | "START_AI_PROCESSING"
  | "COMPLETE_AI_PROCESSING"
  | "FAIL_AI_PROCESSING"
  | "START_SEGMENTATION_REVIEW"
  | "COMPLETE_TECHNICAL_SEGMENTATION_QC"
  | "COMPLETE_QUANTITATIVE_OUTPUT_REVIEW"
  | "COMPLETE_STRUCTURED_VISUAL_REPORT"
  | "START_RADIOLOGIST_REVIEW"
  | "COMPLETE_RADIOLOGIST_REVIEW"
  | "REQUEST_REPROCESSING"
  | "START_PHYSICIAN_SYNTHESIS"
  | "START_PHYSICIAN_REVIEW"
  | "REQUEST_EXTERNAL_OPINION"
  | "SUBMIT_EXTERNAL_OPINION"
  | "DRAFT_FINAL_REPORT"
  | "DRAFT_PATIENT_SAFE_SUMMARY"
  | "SUBMIT_FINAL_CLINICAL_APPROVAL"
  | "APPROVE_PUBLICATION"
  | "PUBLISH_TO_PATIENT_PORTAL"
  | "START_FOLLOW_UP_COORDINATION"
  | "CLOSE_CASE"
  | "START_RESEARCH_ELIGIBILITY"
  | "MARK_RESEARCH_ELIGIBLE"
  | "MARK_RESEARCH_NOT_ELIGIBLE"
  | "PREPARE_DEIDENTIFIED_DATASET"
  | "APPROVE_RESEARCH_EXPORT";

export type CaseOwnerRole =
  | "OPERATIONS"
  | "RADIOLOGIST"
  | "MRI_SCIENTIST_AI_QA"
  | "PHYSICIAN"
  | "PATIENT_CAREGIVER"
  | "RESEARCHER"
  | "DATA_STEWARD"
  | "EXTERNAL_GUEST"
  | "SYSTEM";

export type KioRole =
  | "operations_coordinator"
  | "radiologist"
  | "neuroradiologist"
  | "radiologist_neuroradiologist"
  | "mri_scientist_ai_qa"
  | "physician_neurologist"
  | "patient"
  | "caregiver"
  | "external_guest_reviewer"
  | "psychologist_neuropsychologist_guest"
  | "psychologist_neuropsychologist_guest_reviewer"
  | "researcher"
  | "data_steward_research_admin"
  | "organization_admin";

export type PatientVisibilityLevel =
  | "NO_PATIENT_VISIBILITY"
  | "SAFE_STATUS_ONLY"
  | "ACTION_REQUEST_ONLY"
  | "APPROVED_SUMMARY_VISIBLE";

export type MvpAvailability = "mvp" | "phase2";

export type CaseBlocker = {
  code: string;
  message: string;
  ownerRole: CaseOwnerRole;
  blocking: boolean;
};

export type CaseStateDefinition = {
  id: CaseState;
  label: string;
  description: string;
  phase: CasePhase;
  primaryOwner: CaseOwnerRole;
  supportingRoles: CaseOwnerRole[];
  patientVisibility: PatientVisibilityLevel;
  requiresConsent: boolean;
  requiresClinicalReview: boolean;
  requiresAiOutput: boolean;
  requiresAuditLog: boolean;
  allowedActions: CaseAction[];
  possibleNextStates: CaseState[];
  blockingConditions: string[];
  enabledInMvp: boolean;
  availability: MvpAvailability;
};

const mvp = true;
const phase2 = false;

export const CASE_STATE_DEFINITIONS: Record<CaseState, CaseStateDefinition> = {
  CASE_CREATED: {
    id: "CASE_CREATED",
    label: "Case Created",
    description: "Operational case shell exists; required intake, consent, and MRI readiness may still be missing.",
    phase: "case_initiation",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["PATIENT_CAREGIVER"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: false,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["REQUEST_PATIENT_INFORMATION", "REQUEST_CONSENT", "REQUEST_MRI", "RECEIVE_MRI"],
    possibleNextStates: ["PATIENT_INFORMATION_PENDING", "CONSENT_PENDING", "MRI_REQUESTED", "MRI_RECEIVED"],
    blockingConditions: ["missing_patient_information", "missing_consent", "missing_mri"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PATIENT_INFORMATION_PENDING: {
    id: "PATIENT_INFORMATION_PENDING",
    label: "Patient Information Pending",
    description: "Patient or caregiver information is needed before clinical synthesis can be complete.",
    phase: "case_initiation",
    primaryOwner: "PATIENT_CAREGIVER",
    supportingRoles: ["OPERATIONS"],
    patientVisibility: "ACTION_REQUEST_ONLY",
    requiresConsent: false,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_PATIENT_INFORMATION", "REQUEST_CONSENT", "REQUEST_MRI"],
    possibleNextStates: ["CONSENT_PENDING", "MRI_REQUESTED", "MRI_RECEIVED"],
    blockingConditions: ["missing_patient_information"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  CONSENT_PENDING: {
    id: "CONSENT_PENDING",
    label: "Consent Pending",
    description: "Clinical workflow consent is required before downstream review and publication workflows proceed.",
    phase: "case_initiation",
    primaryOwner: "PATIENT_CAREGIVER",
    supportingRoles: ["OPERATIONS"],
    patientVisibility: "ACTION_REQUEST_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["RECORD_CONSENT", "REQUEST_MRI", "RECEIVE_MRI"],
    possibleNextStates: ["MRI_REQUESTED", "MRI_RECEIVED"],
    blockingConditions: ["missing_consent"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  MRI_REQUESTED: {
    id: "MRI_REQUESTED",
    label: "MRI Requested",
    description: "MRI study has been requested or upload/import is awaited.",
    phase: "mri_intake",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["PATIENT_CAREGIVER"],
    patientVisibility: "ACTION_REQUEST_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["RECEIVE_MRI"],
    possibleNextStates: ["MRI_RECEIVED"],
    blockingConditions: ["missing_mri"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  MRI_RECEIVED: {
    id: "MRI_RECEIVED",
    label: "MRI Received",
    description: "MRI has been received and must be reviewed for intake and readiness.",
    phase: "mri_intake",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_MRI_INTAKE_REVIEW"],
    possibleNextStates: ["MRI_INTAKE_REVIEW_PENDING"],
    blockingConditions: ["mri_not_matched", "missing_study_metadata"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  MRI_INTAKE_REVIEW_PENDING: {
    id: "MRI_INTAKE_REVIEW_PENDING",
    label: "MRI Intake Review Pending",
    description: "Study identity, file integrity, and intake metadata require operational review.",
    phase: "mri_intake",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_MRI_INTAKE_REVIEW"],
    possibleNextStates: ["PROTOCOL_COMPLETENESS_CHECK_PENDING"],
    blockingConditions: ["file_integrity_issue", "identity_match_issue"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PROTOCOL_COMPLETENESS_CHECK_PENDING: {
    id: "PROTOCOL_COMPLETENESS_CHECK_PENDING",
    label: "Protocol Completeness Check Pending",
    description: "Required MRI sequences and protocol completeness must be checked before image QC.",
    phase: "imaging_readiness",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: ["OPERATIONS", "MRI_SCIENTIST_AI_QA"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_PROTOCOL_CHECK"],
    possibleNextStates: ["IMAGE_QUALITY_REVIEW_PENDING"],
    blockingConditions: ["missing_required_sequence"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  IMAGE_QUALITY_REVIEW_PENDING: {
    id: "IMAGE_QUALITY_REVIEW_PENDING",
    label: "Image Quality Review Pending",
    description: "Image quality must be accepted or failed before AI processing can be queued.",
    phase: "imaging_readiness",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: ["MRI_SCIENTIST_AI_QA", "OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["PASS_IMAGE_QUALITY", "FAIL_IMAGE_QUALITY"],
    possibleNextStates: ["IMAGE_QUALITY_PASSED", "IMAGE_QUALITY_FAILED"],
    blockingConditions: ["motion_artifact", "incomplete_coverage", "poor_sequence_quality"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  IMAGE_QUALITY_FAILED: {
    id: "IMAGE_QUALITY_FAILED",
    label: "Image Quality Failed",
    description: "Study quality blocks normal AI processing or requires replacement/rescan/limitation handling.",
    phase: "imaging_readiness",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["REQUEST_MRI", "CLOSE_CASE"],
    possibleNextStates: ["MRI_REQUESTED", "CASE_CLOSED"],
    blockingConditions: ["image_quality_failed"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  IMAGE_QUALITY_PASSED: {
    id: "IMAGE_QUALITY_PASSED",
    label: "Image Quality Passed",
    description: "Study is eligible to enter AI processing if configured for the workflow.",
    phase: "imaging_readiness",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: ["MRI_SCIENTIST_AI_QA", "OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["QUEUE_AI_PROCESSING"],
    possibleNextStates: ["AI_PROCESSING_PENDING"],
    blockingConditions: [],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  AI_PROCESSING_PENDING: {
    id: "AI_PROCESSING_PENDING",
    label: "AI Processing Pending",
    description: "AI processing is queued but has not started.",
    phase: "ai_processing",
    primaryOwner: "SYSTEM",
    supportingRoles: ["MRI_SCIENTIST_AI_QA", "OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_AI_PROCESSING"],
    possibleNextStates: ["AI_PROCESSING_IN_PROGRESS"],
    blockingConditions: ["ai_job_not_started"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  AI_PROCESSING_IN_PROGRESS: {
    id: "AI_PROCESSING_IN_PROGRESS",
    label: "AI Processing In Progress",
    description: "AI job is running; raw output is not patient visible and not physician visible.",
    phase: "ai_processing",
    primaryOwner: "SYSTEM",
    supportingRoles: ["MRI_SCIENTIST_AI_QA"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_AI_PROCESSING", "FAIL_AI_PROCESSING"],
    possibleNextStates: ["QUANTITATIVE_OUTPUT_READY", "AI_PROCESSING_FAILED"],
    blockingConditions: ["processing_in_progress"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  AI_PROCESSING_FAILED: {
    id: "AI_PROCESSING_FAILED",
    label: "AI Processing Failed",
    description: "AI pipeline failed; case can request reprocessing or continue to structured visual reporting without AI output.",
    phase: "ai_processing",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["MRI_SCIENTIST_AI_QA", "RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["REQUEST_REPROCESSING", "COMPLETE_STRUCTURED_VISUAL_REPORT"],
    possibleNextStates: ["REPROCESSING_REQUESTED", "STRUCTURED_VISUAL_REPORT_PENDING"],
    blockingConditions: ["ai_processing_failed"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  QUANTITATIVE_OUTPUT_READY: {
    id: "QUANTITATIVE_OUTPUT_READY",
    label: "Quantitative Output Ready",
    description: "AI generated quantitative outputs; they require segmentation and output review before physician use.",
    phase: "ai_validation",
    primaryOwner: "MRI_SCIENTIST_AI_QA",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: true,
    requiresAuditLog: true,
    allowedActions: ["START_SEGMENTATION_REVIEW"],
    possibleNextStates: ["SEGMENTATION_REVIEW_PENDING"],
    blockingConditions: ["segmentation_review_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  SEGMENTATION_REVIEW_PENDING: {
    id: "SEGMENTATION_REVIEW_PENDING",
    label: "Segmentation Review Pending",
    description: "Technical segmentation QC must be accepted by MRI Scientist / AI QA before clinical acceptance.",
    phase: "ai_validation",
    primaryOwner: "MRI_SCIENTIST_AI_QA",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: true,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_TECHNICAL_SEGMENTATION_QC", "REQUEST_REPROCESSING"],
    possibleNextStates: ["QUANTITATIVE_OUTPUT_REVIEW_PENDING", "REPROCESSING_REQUESTED"],
    blockingConditions: ["technical_segmentation_qc_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  QUANTITATIVE_OUTPUT_REVIEW_PENDING: {
    id: "QUANTITATIVE_OUTPUT_REVIEW_PENDING",
    label: "Quantitative Output Review Pending",
    description: "Radiologist must clinically accept, limit, or suppress AI quantitative output before handoff.",
    phase: "ai_validation",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: ["MRI_SCIENTIST_AI_QA"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: true,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_QUANTITATIVE_OUTPUT_REVIEW", "REQUEST_REPROCESSING"],
    possibleNextStates: ["STRUCTURED_VISUAL_REPORT_PENDING", "REPROCESSING_REQUESTED"],
    blockingConditions: ["radiologist_quantitative_review_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  STRUCTURED_VISUAL_REPORT_PENDING: {
    id: "STRUCTURED_VISUAL_REPORT_PENDING",
    label: "Structured Visual Report Pending",
    description: "Structured radiology visual assessment must be completed before imaging handoff.",
    phase: "radiologist_review",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: [],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_STRUCTURED_VISUAL_REPORT", "START_RADIOLOGIST_REVIEW"],
    possibleNextStates: ["RADIOLOGIST_REVIEW_IN_PROGRESS"],
    blockingConditions: ["structured_visual_report_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RADIOLOGIST_REVIEW_IN_PROGRESS: {
    id: "RADIOLOGIST_REVIEW_IN_PROGRESS",
    label: "Radiologist Review In Progress",
    description: "Radiologist is reviewing imaging evidence and preparing handoff.",
    phase: "radiologist_review",
    primaryOwner: "RADIOLOGIST",
    supportingRoles: ["MRI_SCIENTIST_AI_QA"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["COMPLETE_RADIOLOGIST_REVIEW", "REQUEST_REPROCESSING"],
    possibleNextStates: ["RADIOLOGIST_REVIEW_COMPLETED", "REPROCESSING_REQUESTED"],
    blockingConditions: ["radiologist_handoff_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RADIOLOGIST_REVIEW_COMPLETED: {
    id: "RADIOLOGIST_REVIEW_COMPLETED",
    label: "Radiologist Review Completed",
    description: "Imaging evidence package is accepted for physician clinical synthesis.",
    phase: "radiologist_review",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["RADIOLOGIST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_PHYSICIAN_SYNTHESIS"],
    possibleNextStates: ["PHYSICIAN_CLINICAL_SYNTHESIS_PENDING"],
    blockingConditions: [],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  REPROCESSING_REQUESTED: {
    id: "REPROCESSING_REQUESTED",
    label: "Reprocessing Requested",
    description: "A new AI processing version is requested; prior versions must be retained.",
    phase: "ai_processing",
    primaryOwner: "SYSTEM",
    supportingRoles: ["MRI_SCIENTIST_AI_QA", "RADIOLOGIST", "OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: false,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["QUEUE_AI_PROCESSING"],
    possibleNextStates: ["AI_PROCESSING_PENDING"],
    blockingConditions: ["reprocessing_reason_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PHYSICIAN_CLINICAL_SYNTHESIS_PENDING: {
    id: "PHYSICIAN_CLINICAL_SYNTHESIS_PENDING",
    label: "Physician Clinical Synthesis Pending",
    description: "Physician can now begin clinical synthesis using reviewed imaging evidence and clinical context.",
    phase: "physician_review",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["RADIOLOGIST", "OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_PHYSICIAN_REVIEW"],
    possibleNextStates: ["PHYSICIAN_REVIEW_IN_PROGRESS"],
    blockingConditions: ["clinical_context_may_be_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PHYSICIAN_REVIEW_IN_PROGRESS: {
    id: "PHYSICIAN_REVIEW_IN_PROGRESS",
    label: "Physician Review In Progress",
    description: "Physician is synthesizing reviewed imaging evidence with clinical context.",
    phase: "physician_review",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["RADIOLOGIST", "EXTERNAL_GUEST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["REQUEST_EXTERNAL_OPINION", "DRAFT_FINAL_REPORT"],
    possibleNextStates: ["EXTERNAL_OPINION_REQUESTED", "FINAL_REPORT_DRAFTED"],
    blockingConditions: ["physician_synthesis_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  EXTERNAL_OPINION_REQUESTED: {
    id: "EXTERNAL_OPINION_REQUESTED",
    label: "External Opinion Requested",
    description: "A case-specific, read-only guest opinion has been requested; full guest workflow is Phase 2.",
    phase: "physician_review",
    primaryOwner: "EXTERNAL_GUEST",
    supportingRoles: ["PHYSICIAN"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["SUBMIT_EXTERNAL_OPINION"],
    possibleNextStates: ["EXTERNAL_OPINION_SUBMITTED"],
    blockingConditions: ["external_opinion_pending"],
    enabledInMvp: phase2,
    availability: "phase2",
  },
  EXTERNAL_OPINION_SUBMITTED: {
    id: "EXTERNAL_OPINION_SUBMITTED",
    label: "External Opinion Submitted",
    description: "External opinion is submitted and physician review can resume.",
    phase: "physician_review",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["EXTERNAL_GUEST"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_PHYSICIAN_REVIEW"],
    possibleNextStates: ["PHYSICIAN_REVIEW_IN_PROGRESS"],
    blockingConditions: [],
    enabledInMvp: phase2,
    availability: "phase2",
  },
  FINAL_REPORT_DRAFTED: {
    id: "FINAL_REPORT_DRAFTED",
    label: "Final Report Drafted",
    description: "Physician-owned clinical report draft exists; publication is still blocked.",
    phase: "physician_review",
    primaryOwner: "PHYSICIAN",
    supportingRoles: [],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["DRAFT_PATIENT_SAFE_SUMMARY"],
    possibleNextStates: ["PATIENT_SAFE_SUMMARY_DRAFTED"],
    blockingConditions: ["patient_safe_summary_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PATIENT_SAFE_SUMMARY_DRAFTED: {
    id: "PATIENT_SAFE_SUMMARY_DRAFTED",
    label: "Patient-Safe Summary Drafted",
    description: "Plain-language patient-safe summary has been drafted but not finally approved.",
    phase: "publication",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["SUBMIT_FINAL_CLINICAL_APPROVAL"],
    possibleNextStates: ["FINAL_CLINICAL_APPROVAL_PENDING"],
    blockingConditions: ["final_clinical_approval_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  FINAL_CLINICAL_APPROVAL_PENDING: {
    id: "FINAL_CLINICAL_APPROVAL_PENDING",
    label: "Final Clinical Approval Pending",
    description: "Physician final approval is pending before publication can be approved.",
    phase: "publication",
    primaryOwner: "PHYSICIAN",
    supportingRoles: ["OPERATIONS"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["APPROVE_PUBLICATION", "START_RESEARCH_ELIGIBILITY"],
    possibleNextStates: ["PUBLICATION_APPROVED", "RESEARCH_ELIGIBILITY_PENDING"],
    blockingConditions: ["publication_approval_required"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PUBLICATION_APPROVED: {
    id: "PUBLICATION_APPROVED",
    label: "Publication Approved",
    description: "Physician-approved patient-safe output is ready for portal publication.",
    phase: "publication",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["PHYSICIAN"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["PUBLISH_TO_PATIENT_PORTAL"],
    possibleNextStates: ["PUBLISHED_TO_PATIENT_PORTAL"],
    blockingConditions: ["publication_not_completed"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  PUBLISHED_TO_PATIENT_PORTAL: {
    id: "PUBLISHED_TO_PATIENT_PORTAL",
    label: "Published to Patient Portal",
    description: "Approved patient-safe output is visible to patient/caregiver.",
    phase: "publication",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["PHYSICIAN"],
    patientVisibility: "APPROVED_SUMMARY_VISIBLE",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_FOLLOW_UP_COORDINATION", "CLOSE_CASE", "START_RESEARCH_ELIGIBILITY"],
    possibleNextStates: ["FOLLOW_UP_COORDINATION_PENDING", "CASE_CLOSED", "RESEARCH_ELIGIBILITY_PENDING"],
    blockingConditions: [],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  FOLLOW_UP_COORDINATION_PENDING: {
    id: "FOLLOW_UP_COORDINATION_PENDING",
    label: "Follow-up Coordination Pending",
    description: "Operations coordinates the physician-defined follow-up review point.",
    phase: "follow_up_closure",
    primaryOwner: "OPERATIONS",
    supportingRoles: ["PHYSICIAN", "PATIENT_CAREGIVER"],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["CLOSE_CASE"],
    possibleNextStates: ["CASE_CLOSED"],
    blockingConditions: ["follow_up_coordination_pending"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  CASE_CLOSED: {
    id: "CASE_CLOSED",
    label: "Case Closed",
    description: "Clinical care case is closed or archived; research eligibility can remain separate.",
    phase: "follow_up_closure",
    primaryOwner: "OPERATIONS",
    supportingRoles: [],
    patientVisibility: "SAFE_STATUS_ONLY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["START_RESEARCH_ELIGIBILITY"],
    possibleNextStates: ["RESEARCH_ELIGIBILITY_PENDING"],
    blockingConditions: [],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RESEARCH_ELIGIBILITY_PENDING: {
    id: "RESEARCH_ELIGIBILITY_PENDING",
    label: "Research Eligibility Pending",
    description: "Research eligibility is assessed separately from live care by governed research/admin roles.",
    phase: "research",
    primaryOwner: "DATA_STEWARD",
    supportingRoles: ["RESEARCHER", "OPERATIONS"],
    patientVisibility: "NO_PATIENT_VISIBILITY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["MARK_RESEARCH_ELIGIBLE", "MARK_RESEARCH_NOT_ELIGIBLE"],
    possibleNextStates: ["RESEARCH_ELIGIBLE", "RESEARCH_NOT_ELIGIBLE"],
    blockingConditions: ["research_governance_pending"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RESEARCH_ELIGIBLE: {
    id: "RESEARCH_ELIGIBLE",
    label: "Research Eligible",
    description: "Case is eligible for governed de-identification; not a research export approval.",
    phase: "research",
    primaryOwner: "DATA_STEWARD",
    supportingRoles: ["RESEARCHER"],
    patientVisibility: "NO_PATIENT_VISIBILITY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["PREPARE_DEIDENTIFIED_DATASET"],
    possibleNextStates: ["DEIDENTIFIED_DATASET_READY"],
    blockingConditions: ["deidentification_pending"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RESEARCH_NOT_ELIGIBLE: {
    id: "RESEARCH_NOT_ELIGIBLE",
    label: "Research Not Eligible",
    description: "Case is not available for research use.",
    phase: "research",
    primaryOwner: "DATA_STEWARD",
    supportingRoles: [],
    patientVisibility: "NO_PATIENT_VISIBILITY",
    requiresConsent: false,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: [],
    possibleNextStates: [],
    blockingConditions: ["research_not_eligible"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  DEIDENTIFIED_DATASET_READY: {
    id: "DEIDENTIFIED_DATASET_READY",
    label: "De-identified Dataset Ready",
    description: "De-identified research dataset is prepared; export still requires approval.",
    phase: "research",
    primaryOwner: "DATA_STEWARD",
    supportingRoles: ["RESEARCHER"],
    patientVisibility: "NO_PATIENT_VISIBILITY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: ["APPROVE_RESEARCH_EXPORT"],
    possibleNextStates: ["RESEARCH_EXPORT_APPROVED"],
    blockingConditions: ["research_export_approval_pending"],
    enabledInMvp: mvp,
    availability: "mvp",
  },
  RESEARCH_EXPORT_APPROVED: {
    id: "RESEARCH_EXPORT_APPROVED",
    label: "Research Export Approved",
    description: "Governed research export has been approved; export object lifecycle comes in a later PR.",
    phase: "research",
    primaryOwner: "DATA_STEWARD",
    supportingRoles: ["RESEARCHER"],
    patientVisibility: "NO_PATIENT_VISIBILITY",
    requiresConsent: true,
    requiresClinicalReview: true,
    requiresAiOutput: false,
    requiresAuditLog: true,
    allowedActions: [],
    possibleNextStates: [],
    blockingConditions: [],
    enabledInMvp: phase2,
    availability: "phase2",
  },
};

export const PHASE_2_CASE_STATES = Object.values(CASE_STATE_DEFINITIONS)
  .filter((definition) => !definition.enabledInMvp)
  .map((definition) => definition.id);

export function getCaseStateDefinition(state: CaseState) {
  return CASE_STATE_DEFINITIONS[state];
}
