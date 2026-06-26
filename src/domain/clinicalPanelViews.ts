import type { KioCase } from "../types";
import type { AiProcessingJob, MriStudyReference } from "./aiProcessing";
import type { BiomarkerOutput } from "./biomarkers";
import type { CaseAction } from "./caseState";
import { getAllowedActions, getCurrentOwnerLabel, getNextAction } from "./caseStateSelectors";
import {
  getPhysicianBiomarkerEvidenceView,
  getRadiologistBiomarkerReviewView,
  type PhysicianBiomarkerEvidenceView,
  type RadiologistBiomarkerReviewView,
} from "./clinicalBiomarkerViews";
import type { ImageQualityAssessment } from "./imageQc";
import type { PatientSafeSummaryDraft } from "./patientSafeSummary";
import {
  getLatestPhysicianSynthesisForCase,
  getPatientSafeExcludedContent,
  getPatientSafeSummaryDraftForCase,
  getPatientSafeSummaryPreview,
  getPhysicianEvidenceReviewForCase,
  getPhysicianSynthesisSourceReports,
} from "./physicianSynthesisSelectors";
import type { PhysicianClinicalSynthesis, PhysicianEvidenceReview } from "./physicianSynthesis";
import type { ProtocolCompletenessAssessment } from "./protocolCompleteness";
import type { RadiologistImagingHandoff } from "./radiologistReview";
import { getReportLimitations, getPhysicianEvidenceReportForCase, getReportsForCase } from "./reportSelectors";
import type { StructuredReport } from "./structuredReports";
import type { StructuredVisualAssessment } from "./structuredVisualAssessment";
import {
  getImageQualityAssessmentForCase,
  getPhysicianVisibleStructuredSummary,
  getProtocolCompletenessForCase,
  getRadiologistHandoffForCase,
  getStructuredVisualAssessmentForCase,
  getVisualScoresForCase,
  isStructuredAssessmentBlocked,
  isVisualReadinessSatisfied,
  type PhysicianVisibleStructuredSummary,
} from "./structuredVisualSelectors";
import type { VisualRatingScore } from "./visualRatingScales";

export type ClinicalEvidenceCollections = {
  biomarkerOutputs: BiomarkerOutput[];
  aiProcessingJobs: AiProcessingJob[];
  mriStudies: MriStudyReference[];
  protocolAssessments: ProtocolCompletenessAssessment[];
  imageQualityAssessments: ImageQualityAssessment[];
  structuredVisualAssessments: StructuredVisualAssessment[];
  radiologistHandoffs: RadiologistImagingHandoff[];
  structuredReports: StructuredReport[];
  physicianSyntheses: PhysicianClinicalSynthesis[];
  physicianEvidenceReviews: PhysicianEvidenceReview[];
  patientSafeSummaryDrafts: PatientSafeSummaryDraft[];
};

export type ClinicalPanelHeader = {
  id: string;
  patientName: string;
  age: number;
  sex: KioCase["sex"];
  stateLabel: string;
  currentOwner: string;
  nextAction: string;
  reportStatus: string;
  releaseStatus: string;
};

export type StructuredVisualReviewView = {
  protocolStatus: string;
  imageQualityStatus: string;
  readinessSatisfied: boolean;
  assessmentStatus: string;
  visualScoreRows: VisualRatingScore[];
  atrophySummary: string;
  vascularSummary: string;
  diffusionSummary: string;
  susceptibilitySummary: string;
  hydrocephalusSummary: string;
  limitations: string[];
  blocked: boolean;
};

export type RadiologistCaseReviewView = {
  caseRecord: KioCase;
  header: ClinicalPanelHeader;
  biomarkerView: RadiologistBiomarkerReviewView;
  structuredVisualView: StructuredVisualReviewView;
  handoffSummary?: string;
  handoffStatus?: string;
  structuredReportRefs: Array<{ id: string; type: string; status: string; version: string; pdfRenderable: boolean }>;
  limitations: string[];
  allowedActions: string[];
  blockedActionReasons: string[];
};

export type PhysicianCaseReviewView = {
  caseRecord: KioCase;
  header: ClinicalPanelHeader;
  biomarkerEvidenceView: PhysicianBiomarkerEvidenceView;
  structuredVisualSummary: PhysicianVisibleStructuredSummary;
  radiologistHandoffSummary?: string;
  structuredReportRefs: Array<{ id: string; type: string; status: string; version: string; pdfRenderable: boolean }>;
  synthesis?: PhysicianClinicalSynthesis;
  evidenceReview?: PhysicianEvidenceReview;
  patientSafeSummaryPreview?: ReturnType<typeof getPatientSafeSummaryPreview>;
  patientSafeExcludedContent: ReturnType<typeof getPatientSafeExcludedContent>;
  readiness: {
    evidenceReady: boolean;
    synthesisReadyForFinalApproval: boolean;
    patientSafeDraftReadyForPublicationReview: boolean;
  };
  limitations: string[];
  openQuestions: string[];
  allowedActions: string[];
  blockedActionReasons: string[];
};

export function getRadiologistCaseReviewView(
  caseRecord: KioCase,
  evidence: ClinicalEvidenceCollections,
): RadiologistCaseReviewView {
  const caseId = caseRecord.id;
  const protocol = getProtocolCompletenessForCase(caseId, evidence.protocolAssessments);
  const imageQuality = getImageQualityAssessmentForCase(caseId, evidence.imageQualityAssessments);
  const assessment = getStructuredVisualAssessmentForCase(caseId, evidence.structuredVisualAssessments);
  const handoff = getRadiologistHandoffForCase(caseId, evidence.radiologistHandoffs);
  const reports = getReportsForCase(caseId, evidence.structuredReports);
  const visualScores = getVisualScoresForCase(caseId, evidence.structuredVisualAssessments);
  const biomarkerView = getRadiologistBiomarkerReviewView(caseId, evidence.biomarkerOutputs, evidence.aiProcessingJobs, evidence.mriStudies);
  const structuredVisualView = buildStructuredVisualReviewView(protocol, imageQuality, assessment, visualScores);
  const reportLimitations = reports.flatMap(getReportLimitations);

  return {
    caseRecord,
    header: buildHeader(caseRecord),
    biomarkerView,
    structuredVisualView,
    handoffSummary: handoff?.imagingSummary,
    handoffStatus: handoff?.status,
    structuredReportRefs: reports.map(toReportRef),
    limitations: unique([
      ...structuredVisualView.limitations,
      ...biomarkerView.outputSummaries.flatMap((summary) => summary.limitationCount ? [`${summary.outputType}: ${summary.limitationCount} limitation(s)`] : []),
      ...reportLimitations,
      ...(handoff?.limitations ?? []),
    ]),
    allowedActions: getAllowedActions(caseRecord, "RADIOLOGIST"),
    blockedActionReasons: structuredVisualView.blocked ? ["Structured visual assessment is blocked by protocol or image quality."] : [],
  };
}

export function getPhysicianCaseReviewView(
  caseRecord: KioCase,
  evidence: ClinicalEvidenceCollections,
): PhysicianCaseReviewView {
  const caseId = caseRecord.id;
  const biomarkerEvidenceView = getPhysicianBiomarkerEvidenceView(caseId, evidence.biomarkerOutputs);
  const structuredVisualSummary = getPhysicianVisibleStructuredSummary(caseId, evidence.structuredVisualAssessments, evidence.radiologistHandoffs);
  const handoff = getRadiologistHandoffForCase(caseId, evidence.radiologistHandoffs);
  const reports = getReportsForCase(caseId, evidence.structuredReports);
  const synthesis = getLatestPhysicianSynthesisForCase(caseId, evidence.physicianSyntheses);
  const evidenceReview = getPhysicianEvidenceReviewForCase(caseId, evidence.physicianEvidenceReviews);
  const patientSafeDraft = getPatientSafeSummaryDraftForCase(caseId, evidence.patientSafeSummaryDrafts);
  const physicianReport = getPhysicianEvidenceReportForCase(caseId, evidence.structuredReports);
  const patientSafeReportDraft = getPatientSafeSummaryPreview(patientSafeDraft);
  const sourceReports = synthesis ? getPhysicianSynthesisSourceReports(synthesis, evidence.structuredReports) : [];

  return {
    caseRecord,
    header: buildHeader(caseRecord),
    biomarkerEvidenceView,
    structuredVisualSummary,
    radiologistHandoffSummary: handoff?.imagingSummary,
    structuredReportRefs: reports.map(toReportRef),
    synthesis,
    evidenceReview,
    patientSafeSummaryPreview: patientSafeReportDraft,
    patientSafeExcludedContent: getPatientSafeExcludedContent(patientSafeDraft),
    readiness: {
      evidenceReady: Boolean(evidenceReview?.readyForSynthesis && biomarkerEvidenceView.reviewedOutputCount > 0 && structuredVisualSummary.suitableForPhysicianReview),
      synthesisReadyForFinalApproval: Boolean(synthesis?.suitableForFinalApproval),
      patientSafeDraftReadyForPublicationReview: Boolean(patientSafeDraft?.readyForPublicationReview && !patientSafeDraft.patientVisible),
    },
    limitations: unique([
      ...biomarkerEvidenceView.limitations,
      ...structuredVisualSummary.limitations,
      ...(handoff?.limitations ?? []),
      ...(synthesis?.limitations ?? []),
      ...(evidenceReview?.limitations ?? []),
      ...(physicianReport ? getReportLimitations(physicianReport) : []),
      ...sourceReports.flatMap(getReportLimitations),
    ]),
    openQuestions: synthesis?.openQuestions ?? [],
    allowedActions: getAllowedActions(caseRecord, "PHYSICIAN"),
    blockedActionReasons: evidenceReview && !evidenceReview.readyForSynthesis ? evidenceReview.missingInformation : [],
  };
}

export function getRadiologistVisibleEvidenceBundle(caseId: string, evidence: ClinicalEvidenceCollections) {
  return {
    biomarkerView: getRadiologistBiomarkerReviewView(caseId, evidence.biomarkerOutputs, evidence.aiProcessingJobs, evidence.mriStudies),
    structuredVisualAssessment: getStructuredVisualAssessmentForCase(caseId, evidence.structuredVisualAssessments),
    radiologistHandoff: getRadiologistHandoffForCase(caseId, evidence.radiologistHandoffs),
    reports: getReportsForCase(caseId, evidence.structuredReports),
  };
}

export function getPhysicianVisibleEvidenceBundle(caseId: string, evidence: ClinicalEvidenceCollections) {
  return {
    biomarkerEvidenceView: getPhysicianBiomarkerEvidenceView(caseId, evidence.biomarkerOutputs),
    structuredVisualSummary: getPhysicianVisibleStructuredSummary(caseId, evidence.structuredVisualAssessments, evidence.radiologistHandoffs),
    physicianEvidenceReport: getPhysicianEvidenceReportForCase(caseId, evidence.structuredReports),
    synthesis: getLatestPhysicianSynthesisForCase(caseId, evidence.physicianSyntheses),
    patientSafeSummaryDraft: getPatientSafeSummaryDraftForCase(caseId, evidence.patientSafeSummaryDrafts),
  };
}

export function getClinicalPanelActionAvailability(caseRecord: KioCase, role: "RADIOLOGIST" | "PHYSICIAN", actions: CaseAction[]) {
  const allowed = getAllowedActions(caseRecord, role);
  return actions.map((action) => ({
    action,
    allowed: allowed.includes(action),
    reason: allowed.includes(action) ? undefined : "Action is not available for this role or state.",
  }));
}

export function getClinicalPanelLimitations(caseId: string, evidence: ClinicalEvidenceCollections) {
  return unique([
    ...getReportsForCase(caseId, evidence.structuredReports).flatMap(getReportLimitations),
    ...(getRadiologistHandoffForCase(caseId, evidence.radiologistHandoffs)?.limitations ?? []),
    ...(getLatestPhysicianSynthesisForCase(caseId, evidence.physicianSyntheses)?.limitations ?? []),
  ]);
}

export function getClinicalPanelReadiness(caseId: string, evidence: ClinicalEvidenceCollections) {
  const protocol = getProtocolCompletenessForCase(caseId, evidence.protocolAssessments);
  const imageQuality = getImageQualityAssessmentForCase(caseId, evidence.imageQualityAssessments);
  const structuredVisual = getPhysicianVisibleStructuredSummary(caseId, evidence.structuredVisualAssessments, evidence.radiologistHandoffs);
  const biomarker = getPhysicianBiomarkerEvidenceView(caseId, evidence.biomarkerOutputs);
  return {
    visualReadiness: isVisualReadinessSatisfied(protocol, imageQuality),
    structuredVisualReadyForPhysician: structuredVisual.suitableForPhysicianReview,
    reviewedBiomarkerOutputCount: biomarker.reviewedOutputCount,
  };
}

function buildHeader(caseRecord: KioCase): ClinicalPanelHeader {
  return {
    id: caseRecord.id,
    patientName: caseRecord.patientName,
    age: caseRecord.age,
    sex: caseRecord.sex,
    stateLabel: caseRecord.caseStatus,
    currentOwner: getCurrentOwnerLabel(caseRecord),
    nextAction: getNextAction(caseRecord),
    reportStatus: caseRecord.reportStatus,
    releaseStatus: caseRecord.releaseStatus,
  };
}

function buildStructuredVisualReviewView(
  protocol?: ProtocolCompletenessAssessment,
  imageQuality?: ImageQualityAssessment,
  assessment?: StructuredVisualAssessment,
  visualScores: VisualRatingScore[] = [],
): StructuredVisualReviewView {
  return {
    protocolStatus: protocol?.status ?? "not_started",
    imageQualityStatus: imageQuality?.status ?? "pending",
    readinessSatisfied: isVisualReadinessSatisfied(protocol, imageQuality),
    assessmentStatus: assessment?.status ?? "not_started",
    visualScoreRows: visualScores,
    atrophySummary: assessment ? summarizeAtrophyFindings(assessment) : "Not assessed",
    vascularSummary: assessment?.vascularFindings.vascularBurdenSummary ?? "Not assessed",
    diffusionSummary: assessment?.diffusionFindings.acuteInfarctFlag ? "Acute diffusion finding flagged." : assessment ? "No acute diffusion restriction flagged." : "Not assessed",
    susceptibilitySummary: assessment?.susceptibilityFindings.microbleeds === "present" ? "Microbleeds present; see limitations." : assessment ? "No susceptibility blocker flagged." : "Not assessed",
    hydrocephalusSummary: assessment?.hydrocephalusFindings.nphConcernFlag ? "NPH-related concern flagged." : assessment ? "No NPH concern flag." : "Not assessed",
    limitations: unique([...(protocol?.limitations ?? []), ...(imageQuality?.limitations ?? []), ...(assessment?.limitations ?? [])]),
    blocked: Boolean(isStructuredAssessmentBlocked(assessment) || protocol?.suitableForVisualAssessment === false || imageQuality?.suitableForRadiologistReview === false),
  };
}

function summarizeAtrophyFindings(assessment: StructuredVisualAssessment) {
  const { globalCorticalAtrophy, medialTemporalAtrophy, parietalPosteriorAtrophy } = assessment.atrophyFindings;
  if ([globalCorticalAtrophy, medialTemporalAtrophy, parietalPosteriorAtrophy].includes("limited_by_quality")) {
    return "Atrophy assessment is limited by image quality.";
  }
  return `Global cortical atrophy: ${globalCorticalAtrophy}; medial temporal atrophy: ${medialTemporalAtrophy}; posterior/parietal atrophy: ${parietalPosteriorAtrophy}`;
}

function toReportRef(report: StructuredReport) {
  return {
    id: report.id,
    type: report.reportType,
    status: report.status,
    version: report.version,
    pdfRenderable: report.pdfRenderable,
  };
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
