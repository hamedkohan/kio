export type MetricCategory =
  | "global_brain"
  | "csf_icv"
  | "ventricular"
  | "hippocampal"
  | "temporal"
  | "parietal"
  | "frontal"
  | "occipital"
  | "cingulate"
  | "entorhinal"
  | "corticometry"
  | "ad_relevant"
  | "longitudinal"
  | "technical_qc";

export type MeasurementType =
  | "volume"
  | "cortical_thickness"
  | "ratio"
  | "score"
  | "percentile"
  | "z_score"
  | "percent_change"
  | "absolute_change"
  | "annualized_change";

export type Laterality = "left" | "right" | "bilateral" | "total" | "midline" | "not_applicable";

export type MetricValidityStatus =
  | "valid"
  | "valid_with_limitations"
  | "qc_pending"
  | "invalid"
  | "suppressed"
  | "not_available";

export type MetricVisibilityStatus =
  | "technical_only"
  | "radiologist_visible"
  | "physician_visible_after_review"
  | "patient_safe_only"
  | "research_visible_deidentified"
  | "hidden";

export type MetricReferenceRange = {
  lower?: number;
  upper?: number;
  label?: string;
  population?: string;
};

export type BiomarkerMetric = {
  id: string;
  outputId: string;
  metricKey: string;
  label: string;
  category: MetricCategory;
  region: string;
  laterality: Laterality;
  measurementType: MeasurementType;
  value: number | null;
  unit?: "ml" | "cm3" | "mm" | "percent" | "score" | "z" | "ratio";
  normalizedValue?: number;
  percentOfIcv?: number;
  percentile?: number;
  zScore?: number;
  referenceRange?: MetricReferenceRange;
  comparisonLabel?: string;
  changePercent?: number;
  absoluteChange?: number;
  annualizedChange?: number;
  baselineValue?: number;
  followUpValue?: number;
  validityStatus: MetricValidityStatus;
  visibilityStatus: MetricVisibilityStatus;
  suppressed: boolean;
  suppressionReason?: string;
  limitations: string[];
  displayPriority: number;
  patientVisible: boolean;
};

export function isMetricValidForReviewedUse(metric: BiomarkerMetric) {
  return ["valid", "valid_with_limitations"].includes(metric.validityStatus) && !metric.suppressed;
}
