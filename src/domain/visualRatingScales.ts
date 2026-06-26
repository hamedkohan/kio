export type VisualRatingScale =
  | "mta"
  | "fazekas"
  | "koedam_posterior_atrophy"
  | "gca"
  | "frontal_atrophy"
  | "parietal_atrophy"
  | "vascular_burden";

export type VisualScoreSide = "left" | "right" | "bilateral" | "global" | "not_applicable";

export type VisualScoreConfidence = "high" | "moderate" | "low" | "not_assessed";

export type VisualRatingScore = {
  id: string;
  scale: VisualRatingScale;
  label: string;
  value: number | null;
  side: VisualScoreSide;
  rangeMin: number;
  rangeMax: number;
  sequenceReference: string;
  confidence: VisualScoreConfidence;
  limitations: string[];
  required: boolean;
  completed: boolean;
  notes?: string;
};

export type VisualSeverity = "none" | "mild" | "moderate" | "severe" | "not_assessed" | "limited_by_quality";

export const CORE_DEMENTIA_VISUAL_SCALES: VisualRatingScale[] = [
  "mta",
  "fazekas",
  "koedam_posterior_atrophy",
  "gca",
];

export function isVisualRatingComplete(score: VisualRatingScore) {
  return score.completed && score.value !== null;
}
