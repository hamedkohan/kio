import { useEffect, useState } from "react";

// ── Imaging-analysis API contract ────────────────────────────────────────────
// Canonical response returned by the imaging pipeline (NeuroTrack / AI morphometry)
// for one case. The same shape is produced by the mock adapter (bundled JSON) and
// by a real backend; switch with VITE_IMAGING_API_MODE / VITE_IMAGING_API_BASE.

export type RegionAnalysis = {
  region: string; // Desikan-Killiany region name (FreeSurfer aparc)
  atlas: string; // "desikan-killiany"
  percentile: number; // normative percentile (0 = severe atrophy … 100 = normal)
  z_score: number;
  value: number | null;
  unit: string | null;
  previous_value: number | null;
  change_percent: number | null;
  flagged: boolean; // pipeline-flagged outlier
};

export type ImagingAnnotation = {
  region: string;
  hemisphere: "left" | "right" | "total" | string;
  severity: "mild" | "marked" | string;
  note: string;
  author_role: string; // "radiologist"
  status: "suggested" | "confirmed" | string;
};

export type ImagingAnalysisResponse = {
  schema_version: string;
  case_id: string;
  study: {
    study_date?: string | null;
    comparison_study_date?: string | null;
    modality?: string;
    primary_module?: string;
  };
  patient: { age_at_study?: number; sex?: string };
  qc: { status: string; motion?: string; coverage?: string };
  mesh: {
    surface_url: string; // PLY with per-vertex DK colour
    centroids_url: string; // region → hemisphere centroid
    parcellation: string; // "desikan-killiany"
    parcellation_source: "freesurfer_aparc" | "approximate_demo" | string;
    space: string; // "fsaverage5"
  };
  regions: RegionAnalysis[];
  annotations: ImagingAnnotation[];
  provenance: { pipeline?: string; generated_by?: string };
};

export type RegionCentroids = Record<
  string,
  { left?: [number, number, number]; right?: [number, number, number] }
>;

const MODE = (import.meta.env.VITE_IMAGING_API_MODE as string | undefined) ?? "mock";
const BASE = (import.meta.env.VITE_IMAGING_API_BASE as string | undefined) ?? "";

// Resolve the analysis endpoint. Real mode hits the backend contract route;
// mock mode reads the bundled per-case JSON (same shape) from public assets.
function analysisUrl(caseId: string): string {
  if (MODE === "http" && BASE) return `${BASE.replace(/\/$/, "")}/cases/${caseId}/imaging-analysis`;
  return `${import.meta.env.BASE_URL}demo-data/api/analysis-${caseId}.json`;
}

function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export async function getImagingAnalysis(caseId: string): Promise<ImagingAnalysisResponse | null> {
  try {
    const res = await fetch(analysisUrl(caseId));
    if (!res.ok) return null;
    return (await res.json()) as ImagingAnalysisResponse;
  } catch {
    return null;
  }
}

let centroidCache: RegionCentroids | null = null;
export async function getRegionCentroids(centroidsPath = "demo-data/mesh/region_centroids.json"): Promise<RegionCentroids> {
  if (centroidCache) return centroidCache;
  try {
    const res = await fetch(assetUrl(centroidsPath));
    centroidCache = res.ok ? ((await res.json()) as RegionCentroids) : {};
  } catch {
    centroidCache = {};
  }
  return centroidCache;
}

export type ImagingAnalysisState = {
  analysis: ImagingAnalysisResponse | null;
  centroids: RegionCentroids;
  meshUrl: string | null;
  loading: boolean;
};

// React hook: load the analysis + region centroids for a case via the client.
export function useImagingAnalysis(caseId: string | undefined): ImagingAnalysisState {
  const [state, setState] = useState<ImagingAnalysisState>({ analysis: null, centroids: {}, meshUrl: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!caseId) {
      setState({ analysis: null, centroids: {}, meshUrl: null, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    (async () => {
      const [analysis, centroids] = await Promise.all([getImagingAnalysis(caseId), getRegionCentroids()]);
      if (cancelled) return;
      setState({
        analysis,
        centroids,
        meshUrl: analysis ? assetUrl(analysis.mesh.surface_url) : null,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  return state;
}
