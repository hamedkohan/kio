import type { BiomarkerOutput } from "./biomarkers";
import type { BiomarkerMetric } from "./biomarkerMetrics";
import { isMetricValidForReviewedUse } from "./biomarkerMetrics";

export type PatientSafeMetricSummary = {
  label: string;
  explanation: string;
};

export type ResearchMetricAvailability = {
  researchCaseId: string;
  availableCategories: string[];
  outputTypes: string[];
  hasVolumetry: boolean;
  hasCorticometry: boolean;
  hasAdRelevantMetrics: boolean;
  hasLongitudinalComparison: boolean;
  highLevelValidity: "available" | "limited" | "unavailable";
};

export type LegacyFinding = {
  region: string;
  volume: string;
  percentile: number;
  comparison: string;
  indication?: string;
};

export function getBiomarkerOutputsForCase(caseId: string, outputs: BiomarkerOutput[]) {
  return outputs.filter((output) => output.caseId === caseId);
}

export function getReviewedOutputsForPhysician(caseId: string, outputs: BiomarkerOutput[]) {
  return getBiomarkerOutputsForCase(caseId, outputs).filter(isOutputSuitableForPhysicianReview);
}

export function getRawOutputsForRadiologist(caseId: string, outputs: BiomarkerOutput[]) {
  return getBiomarkerOutputsForCase(caseId, outputs).filter((output) => output.suitableForRadiologistReview && output.status !== "suppressed");
}

export function getTechnicalQcOutputs(caseId: string, outputs: BiomarkerOutput[]) {
  return getBiomarkerOutputsForCase(caseId, outputs).filter((output) => output.outputType === "segmentation_qc" || Boolean(output.segmentationQc));
}

export function getPatientSafeMetricSummaries(caseId: string, outputs: BiomarkerOutput[]): PatientSafeMetricSummary[] {
  return getReviewedOutputsForPhysician(caseId, outputs)
    .flatMap((output) => output.metrics)
    .filter(isMetricPatientVisible)
    .map((metric) => ({
      label: metric.label,
      explanation: metric.comparisonLabel ?? "Reviewed by the specialist team.",
    }));
}

export function getResearchEligibleMetricAvailability(caseId: string, outputs: BiomarkerOutput[], researchCaseId = "deidentified_case"): ResearchMetricAvailability {
  const eligibleOutputs = getBiomarkerOutputsForCase(caseId, outputs).filter((output) => output.researchEligible && output.status !== "suppressed");
  const metrics = eligibleOutputs.flatMap((output) => output.metrics).filter((metric) => !isMetricSuppressed(metric));
  const categories = [...new Set(metrics.map((metric) => metric.category))];
  const outputTypes = [...new Set(eligibleOutputs.map((output) => output.outputType))];
  const limited = metrics.some((metric) => metric.validityStatus === "valid_with_limitations");

  return {
    researchCaseId,
    availableCategories: categories,
    outputTypes,
    hasVolumetry: outputTypes.includes("volumetry"),
    hasCorticometry: outputTypes.includes("corticometry"),
    hasAdRelevantMetrics: categories.includes("ad_relevant") || outputTypes.includes("ad_summary"),
    hasLongitudinalComparison: outputTypes.includes("longitudinal_comparison"),
    highLevelValidity: eligibleOutputs.length ? limited ? "limited" : "available" : "unavailable",
  };
}

export function isOutputSuitableForPhysicianReview(output: BiomarkerOutput) {
  return output.suitableForPhysicianReview
    && output.reviewStatus === "radiologist_reviewed"
    && output.status !== "suppressed"
    && output.metrics.some(isMetricValidForReviewedUse);
}

export function isMetricPatientVisible(metric: BiomarkerMetric) {
  return Boolean(metric.patientVisible)
    && metric.visibilityStatus === "patient_safe_only"
    && !isMetricSuppressed(metric);
}

export function isMetricSuppressed(metric: BiomarkerMetric) {
  return metric.suppressed || metric.validityStatus === "suppressed" || metric.visibilityStatus === "hidden";
}

export function getMetricDisplayLabel(metric: BiomarkerMetric) {
  const laterality = metric.laterality === "not_applicable" ? "" : `${metric.laterality} `;
  return `${laterality}${metric.label}`;
}

export function deriveLegacyFindingsFromOutputs(caseId: string, outputs: BiomarkerOutput[]): LegacyFinding[] {
  return getBiomarkerOutputsForCase(caseId, outputs)
    .flatMap((output) => output.metrics)
    .filter((metric) => ["radiologist_visible", "physician_visible_after_review", "research_visible_deidentified"].includes(metric.visibilityStatus))
    .filter((metric) => !isMetricSuppressed(metric) && metric.value !== null)
    .sort((left, right) => left.displayPriority - right.displayPriority)
    .map((metric) => ({
      region: metric.region,
      volume: metric.unit ? `${metric.value} ${metric.unit}` : `${metric.value}`,
      percentile: metric.percentile ?? 0,
      comparison: metric.comparisonLabel ?? "No comparison label",
      indication: metric.category === "ad_relevant" ? metric.label : undefined,
    }));
}
