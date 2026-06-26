import type { ReportTypeId } from "./reportTypes";

export type QuantitativeReportStatus =
  | "placeholder"
  | "draft"
  | "ready_for_review"
  | "reviewed"
  | "suppressed";

export type QuantitativeReportPlaceholder = {
  id: string;
  caseId: string;
  reportTypeId: ReportTypeId;
  sourceOutputIds: string[];
  status: QuantitativeReportStatus;
  version: string;
  createdAt: string;
  structuredDataRequired: boolean;
  pdfRenderable: boolean;
  patientVisible: boolean;
  notes?: string;
};
