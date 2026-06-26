import type { ReportEvidenceReference } from "./reportEvidence";
import { isEvidencePatientSafe } from "./reportEvidence";
import type { ReportSection } from "./reportSections";
import { isSectionPatientSafe } from "./reportSections";
import type { StructuredReport } from "./structuredReports";
import { REPORT_TYPE_DEFINITIONS, type ReportTypeDefinition, type ReportTypeId } from "./reportTypes";

export type PatientSafeReportDraftView = {
  id: string;
  caseId: string;
  status: string;
  safeTitle: string;
  safeContent?: string;
  reportAvailable: boolean;
};

export function getReportsForCase(caseId: string, reports: StructuredReport[]) {
  return reports.filter((report) => report.caseId === caseId);
}

export function getLatestReportForCase(caseId: string, reports: StructuredReport[], reportType?: ReportTypeId) {
  return getReportsForCase(caseId, reports)
    .filter((report) => !reportType || report.reportType === reportType)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function getReportSections(reportId: string, reports: StructuredReport[]): ReportSection[] {
  return reports.find((report) => report.id === reportId)?.sections ?? [];
}

export function getEvidenceReferencesForReport(reportId: string, reports: StructuredReport[]): ReportEvidenceReference[] {
  return reports.find((report) => report.id === reportId)?.evidenceReferences ?? [];
}

export function getRadiologistReportDraftForCase(caseId: string, reports: StructuredReport[]) {
  return getLatestReportForCase(caseId, reports, "radiologist_reviewed_quantitative_summary");
}

export function getPhysicianEvidenceReportForCase(caseId: string, reports: StructuredReport[]) {
  return getLatestReportForCase(caseId, reports, "physician_facing_evidence_summary");
}

export function getPatientSafeReportDraftForCase(caseId: string, reports: StructuredReport[]): PatientSafeReportDraftView | undefined {
  const report = getLatestReportForCase(caseId, reports, "patient_safe_summary");
  if (!report) return undefined;
  const patientSafeSections = report.sections.filter(isSectionPatientSafe);
  const patientSafeEvidence = report.evidenceReferences.filter(isEvidencePatientSafe);

  return {
    id: report.id,
    caseId: report.caseId,
    status: report.status,
    safeTitle: "Patient-safe summary draft",
    safeContent: report.patientVisible ? patientSafeSections.map((section) => section.content).join("\n\n") : undefined,
    reportAvailable: report.patientVisible && patientSafeSections.length > 0 && patientSafeEvidence.every((reference) => reference.patientVisible),
  };
}

export function isReportPdfRenderable(report: StructuredReport) {
  return report.pdfRenderable;
}

export function isReportPatientVisible(report: StructuredReport) {
  return report.patientVisible;
}

export function isReportStructuredDataSourceOfTruth(report: StructuredReport) {
  return report.sourceOfTruth === "structured_data";
}

export function getReportTypeMetadata(report: StructuredReport): ReportTypeDefinition {
  return REPORT_TYPE_DEFINITIONS[report.reportType];
}

export function getReportLimitations(report: StructuredReport) {
  return [
    ...report.limitations,
    ...report.sections.flatMap((section) => section.limitations),
    ...report.evidenceReferences.flatMap((reference) => reference.limitations),
  ];
}
