import type { AiProcessingJob, MriStudyReference } from "./aiProcessing";
import type { BiomarkerOutput, BiomarkerOutputType } from "./biomarkers";
import type { BiomarkerMetric, MetricValidityStatus } from "./biomarkerMetrics";
import {
  getRawOutputsForRadiologist,
  getReviewedOutputsForPhysician,
  getTechnicalQcOutputs,
  isMetricSuppressed,
} from "./biomarkerSelectors";

export type BiomarkerMetricReviewRow = {
  id: string;
  outputId: string;
  outputType: BiomarkerOutputType;
  label: string;
  region: string;
  valueLabel: string;
  percentile?: number;
  comparisonLabel: string;
  validityStatus: MetricValidityStatus;
  limitations: string[];
  isSuppressed: boolean;
};

export type SegmentationQcView = {
  status: string;
  radiologistAcceptanceStatus: string;
  suitableForQuantitativeReview: boolean;
  suitableForPhysicianHandoff: boolean;
  reprocessingRecommended: boolean;
  issues: string[];
  limitations: string[];
};

export type ClinicalBiomarkerOutputSummary = {
  outputId: string;
  outputType: BiomarkerOutputType;
  status: string;
  reviewStatus: string;
  version: string;
  algorithmVersion: string;
  referenceDatasetVersion: string;
  suitableForRadiologistReview: boolean;
  suitableForPhysicianReview: boolean;
  limitationCount: number;
};

export type RadiologistBiomarkerReviewView = {
  caseId: string;
  aiProcessingStatus: string;
  pipelineVersion?: string;
  algorithmVersion?: string;
  referenceDatasetVersion?: string;
  mriProtocol?: string;
  mriQualityStatus?: string;
  outputSummaries: ClinicalBiomarkerOutputSummary[];
  metricRows: BiomarkerMetricReviewRow[];
  segmentationQc?: SegmentationQcView;
  availability: {
    volumetry: boolean;
    corticometry: boolean;
    adRelevant: boolean;
    longitudinal: boolean;
  };
  suppressedCount: number;
  invalidCount: number;
  emptyReason?: string;
};

export type PhysicianBiomarkerEvidenceView = {
  caseId: string;
  reviewedOutputCount: number;
  metricRows: BiomarkerMetricReviewRow[];
  adRelevantSummary: BiomarkerMetricReviewRow[];
  longitudinalSummary: BiomarkerMetricReviewRow[];
  limitations: string[];
  emptyReason?: string;
};

export function getRadiologistBiomarkerReviewView(
  caseId: string,
  outputs: BiomarkerOutput[],
  jobs: AiProcessingJob[],
  studies: MriStudyReference[],
): RadiologistBiomarkerReviewView {
  const caseOutputs = getRawOutputsForRadiologist(caseId, outputs);
  const caseJobs = jobs.filter((job) => job.caseId === caseId);
  const latestJob = caseJobs[caseJobs.length - 1];
  const latestStudy = studies.find((study) => study.id === latestJob?.mriStudyId) ?? studies.find((study) => study.caseId === caseId);
  const metrics = caseOutputs.flatMap((output) => output.metrics.map((metric) => ({ output, metric })));
  const suppressedCount = metrics.filter(({ metric }) => isMetricSuppressed(metric)).length;
  const invalidCount = metrics.filter(({ metric }) => metric.validityStatus === "invalid").length;
  const visibleMetrics = metrics
    .filter(({ metric }) => !isMetricSuppressed(metric) && metric.validityStatus !== "invalid")
    .sort((left, right) => left.metric.displayPriority - right.metric.displayPriority);

  return {
    caseId,
    aiProcessingStatus: latestJob?.status ?? "not_started",
    pipelineVersion: latestJob?.pipelineVersion,
    algorithmVersion: latestJob?.algorithmVersion,
    referenceDatasetVersion: latestJob?.referenceDatasetVersion,
    mriProtocol: latestStudy?.protocolName,
    mriQualityStatus: latestStudy?.qualityStatus,
    outputSummaries: caseOutputs.map(toOutputSummary),
    metricRows: visibleMetrics.map(({ output, metric }) => toMetricRow(output, metric)),
    segmentationQc: getSegmentationQcView(caseId, outputs),
    availability: {
      volumetry: caseOutputs.some((output) => output.outputType === "volumetry"),
      corticometry: caseOutputs.some((output) => output.outputType === "corticometry"),
      adRelevant: caseOutputs.some((output) => output.outputType === "ad_summary" || output.metrics.some((metric) => metric.category === "ad_relevant")),
      longitudinal: caseOutputs.some((output) => output.outputType === "longitudinal_comparison"),
    },
    suppressedCount,
    invalidCount,
    emptyReason: caseOutputs.length ? undefined : "AI output is pending review or not suitable for radiologist review.",
  };
}

export function getPhysicianBiomarkerEvidenceView(caseId: string, outputs: BiomarkerOutput[]): PhysicianBiomarkerEvidenceView {
  const reviewedOutputs = getReviewedOutputsForPhysician(caseId, outputs);
  const metricRows = reviewedOutputs
    .flatMap((output) => output.metrics.map((metric) => ({ output, metric })))
    .filter(({ metric }) => !isMetricSuppressed(metric) && ["valid", "valid_with_limitations"].includes(metric.validityStatus))
    .sort((left, right) => left.metric.displayPriority - right.metric.displayPriority)
    .map(({ output, metric }) => toMetricRow(output, metric));
  const limitations = reviewedOutputs.flatMap((output) => output.limitations);

  return {
    caseId,
    reviewedOutputCount: reviewedOutputs.length,
    metricRows,
    adRelevantSummary: metricRows.filter((row) => row.outputType === "ad_summary"),
    longitudinalSummary: metricRows.filter((row) => row.outputType === "longitudinal_comparison"),
    limitations,
    emptyReason: reviewedOutputs.length ? undefined : "No reviewed quantitative output available yet.",
  };
}

export function getSegmentationQcView(caseId: string, outputs: BiomarkerOutput[]): SegmentationQcView | undefined {
  const qcOutput = getTechnicalQcOutputs(caseId, outputs).find((output) => output.segmentationQc);
  const qc = qcOutput?.segmentationQc;
  if (!qc) return undefined;
  return {
    status: qc.status,
    radiologistAcceptanceStatus: qc.radiologistAcceptanceStatus,
    suitableForQuantitativeReview: qc.suitableForQuantitativeReview,
    suitableForPhysicianHandoff: qc.suitableForPhysicianHandoff,
    reprocessingRecommended: qc.reprocessingRecommended,
    issues: qc.issues.map((issue) => issue.label),
    limitations: qc.limitations,
  };
}

export function getAdRelevantMetricSummary(caseId: string, outputs: BiomarkerOutput[]) {
  return getPhysicianBiomarkerEvidenceView(caseId, outputs).adRelevantSummary;
}

export function getLongitudinalMetricSummary(caseId: string, outputs: BiomarkerOutput[]) {
  return getPhysicianBiomarkerEvidenceView(caseId, outputs).longitudinalSummary;
}

function toOutputSummary(output: BiomarkerOutput): ClinicalBiomarkerOutputSummary {
  return {
    outputId: output.id,
    outputType: output.outputType,
    status: output.status,
    reviewStatus: output.reviewStatus,
    version: output.version,
    algorithmVersion: output.algorithmVersion,
    referenceDatasetVersion: output.referenceDatasetVersion,
    suitableForRadiologistReview: output.suitableForRadiologistReview,
    suitableForPhysicianReview: output.suitableForPhysicianReview,
    limitationCount: output.limitations.length,
  };
}

function toMetricRow(output: BiomarkerOutput, metric: BiomarkerMetric): BiomarkerMetricReviewRow {
  return {
    id: metric.id,
    outputId: output.id,
    outputType: output.outputType,
    label: metric.label,
    region: metric.region,
    valueLabel: formatMetricValue(metric),
    percentile: metric.percentile,
    comparisonLabel: metric.comparisonLabel ?? "No reviewed comparison",
    validityStatus: metric.validityStatus,
    limitations: metric.limitations,
    isSuppressed: isMetricSuppressed(metric),
  };
}

function formatMetricValue(metric: BiomarkerMetric) {
  if (metric.value === null) return "Not available";
  if (!metric.unit) return `${metric.value}`;
  return `${metric.value} ${metric.unit}`;
}
