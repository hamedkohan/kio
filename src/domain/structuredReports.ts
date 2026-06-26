import type { KioRole } from "./caseState";
import type { ReportEvidenceReference } from "./reportEvidence";
import type { ReportSection } from "./reportSections";
import type { ReportIntendedAudience, ReportSourceOfTruth, StructuredReportStatus } from "./reportStatus";
import type { ReportTypeId } from "./reportTypes";

export type StructuredReport = {
  id: string;
  caseId: string;
  reportType: ReportTypeId;
  status: StructuredReportStatus;
  createdAt: string;
  updatedAt: string;
  createdByRole: KioRole;
  primaryOwnerRole: KioRole;
  intendedAudience: ReportIntendedAudience;
  sourceMriStudyIds: string[];
  sourceBiomarkerOutputIds: string[];
  sourceStructuredVisualAssessmentIds: string[];
  sourceRadiologistHandoffIds: string[];
  sections: ReportSection[];
  evidenceReferences: ReportEvidenceReference[];
  limitations: string[];
  version: string;
  supersedesReportId?: string;
  patientVisible: boolean;
  researchEligible: boolean;
  pdfRenderable: boolean;
  sourceOfTruth: ReportSourceOfTruth;
};

type ReportDraftInput = {
  id: string;
  caseId: string;
  createdAt: string;
  sourceMriStudyIds?: string[];
  sourceBiomarkerOutputIds?: string[];
  sourceStructuredVisualAssessmentIds?: string[];
  sourceRadiologistHandoffIds?: string[];
  sections?: ReportSection[];
  evidenceReferences?: ReportEvidenceReference[];
  limitations?: string[];
  version?: string;
};

export function createRadiologistQuantitativeReportDraft(input: ReportDraftInput): StructuredReport {
  return createStructuredReportDraft({
    ...input,
    reportType: "radiologist_reviewed_quantitative_summary",
    status: "draft",
    createdByRole: "radiologist",
    primaryOwnerRole: "radiologist",
    intendedAudience: "radiologist",
    pdfRenderable: true,
    researchEligible: true,
  });
}

export function createRadiologistVisualAssessmentReportDraft(input: ReportDraftInput): StructuredReport {
  return createStructuredReportDraft({
    ...input,
    reportType: "radiologist_reviewed_quantitative_summary",
    status: "draft",
    createdByRole: "radiologist",
    primaryOwnerRole: "radiologist",
    intendedAudience: "radiologist",
    pdfRenderable: false,
    researchEligible: true,
  });
}

export function createPhysicianEvidenceReportDraft(input: ReportDraftInput): StructuredReport {
  return createStructuredReportDraft({
    ...input,
    reportType: "physician_facing_evidence_summary",
    status: "physician_synthesis_draft",
    createdByRole: "physician_neurologist",
    primaryOwnerRole: "physician_neurologist",
    intendedAudience: "physician",
    pdfRenderable: false,
    researchEligible: false,
  });
}

export function createPatientSafeSummaryDraftPlaceholder(input: ReportDraftInput): StructuredReport {
  return createStructuredReportDraft({
    ...input,
    reportType: "patient_safe_summary",
    status: "patient_safe_summary_draft",
    createdByRole: "physician_neurologist",
    primaryOwnerRole: "physician_neurologist",
    intendedAudience: "patient_safe",
    pdfRenderable: true,
    researchEligible: false,
    patientVisible: false,
  });
}

function createStructuredReportDraft(input: ReportDraftInput & {
  reportType: ReportTypeId;
  status: StructuredReportStatus;
  createdByRole: KioRole;
  primaryOwnerRole: KioRole;
  intendedAudience: ReportIntendedAudience;
  pdfRenderable: boolean;
  researchEligible: boolean;
  patientVisible?: boolean;
}): StructuredReport {
  return {
    id: input.id,
    caseId: input.caseId,
    reportType: input.reportType,
    status: input.status,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    createdByRole: input.createdByRole,
    primaryOwnerRole: input.primaryOwnerRole,
    intendedAudience: input.intendedAudience,
    sourceMriStudyIds: input.sourceMriStudyIds ?? [],
    sourceBiomarkerOutputIds: input.sourceBiomarkerOutputIds ?? [],
    sourceStructuredVisualAssessmentIds: input.sourceStructuredVisualAssessmentIds ?? [],
    sourceRadiologistHandoffIds: input.sourceRadiologistHandoffIds ?? [],
    sections: input.sections ?? [],
    evidenceReferences: input.evidenceReferences ?? [],
    limitations: input.limitations ?? ["Draft structured report object only; no approval or publication lifecycle is implemented."],
    version: input.version ?? "draft v0.1",
    patientVisible: input.patientVisible ?? false,
    researchEligible: input.researchEligible,
    pdfRenderable: input.pdfRenderable,
    sourceOfTruth: "structured_data",
  };
}
