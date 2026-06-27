# Imaging Analysis API contract

The imaging pipeline (NeuroTrack / AI morphometry) returns one **imaging-analysis**
document per case. The frontend consumes it through a single client
(`src/api/imagingAnalysis.ts`) that has two interchangeable adapters:

| Mode | Selected by | Source |
| --- | --- | --- |
| `mock` (default) | `VITE_IMAGING_API_MODE` unset or `mock` | bundled `public/demo-data/api/analysis-<case>.json` |
| `http` | `VITE_IMAGING_API_MODE=http` + `VITE_IMAGING_API_BASE=https://…` | `GET {BASE}/cases/{caseId}/imaging-analysis` |

Switching to a real backend is configuration only — no code change. The mock
files are produced by `scripts/generate_brain_meshes.py` from the same data, so
the demo and a real deployment exercise the identical shape.

## Endpoint

```
GET {BASE}/cases/{caseId}/imaging-analysis  ->  ImagingAnalysisResponse
```

## Response shape

```jsonc
{
  "schema_version": "1.0",
  "case_id": "case-003",
  "study": {
    "study_date": "2024-02-10",
    "comparison_study_date": "2023-02-12",   // null for single timepoint
    "modality": "MRI",
    "primary_module": "ai_longitudinal_biomarkers"
  },
  "patient": { "age_at_study": 71, "sex": "male" },
  "qc": { "status": "acceptable", "motion": "within tolerance", "coverage": "complete" },

  "mesh": {
    "surface_url": "demo-data/mesh/brain-case-003.ply", // PLY, per-vertex DK colour
    "centroids_url": "demo-data/mesh/region_centroids.json",
    "parcellation": "desikan-killiany",
    "parcellation_source": "freesurfer_aparc | approximate_demo",
    "space": "fsaverage5"
  },

  "regions": [                                  // one per Desikan-Killiany region
    {
      "region": "superiorparietal",            // FreeSurfer aparc name
      "atlas": "desikan-killiany",
      "percentile": 1.5,                        // 0 = severe atrophy … 100 = normal
      "z_score": -2.43,
      "value": 16.9, "unit": "cm3",
      "previous_value": 17.7, "change_percent": 2.23,
      "flagged": true                           // pipeline outlier
    }
  ],

  "annotations": [                              // radiologist markers (seedable by pipeline)
    {
      "region": "superiorparietal",
      "hemisphere": "left | right | total",
      "severity": "mild | marked",
      "note": "Low normative percentile — review for atrophy.",
      "author_role": "radiologist",
      "status": "suggested | confirmed"
    }
  ],

  "provenance": { "pipeline": "NeuroTrack morphometry", "generated_by": "…" }
}
```

## Mesh + parcellation

- `surface_url` is a PLY cortical surface with **per-vertex RGB** baked from each
  region's percentile (red = low / atrophied → light = normal), shaded by sulcal
  depth. NiiVue renders it directly.
- `centroids_url` maps each region to its `{ left, right }` centroid in mesh space;
  used to place annotation marker spheres on the surface.
- `parcellation_source` tells the UI whether boundaries are the **real**
  FreeSurfer `aparc.annot` (`freesurfer_aparc`) or the **approximate** demo
  parcellation (`approximate_demo`). Drop a real `lh/rh.aparc.annot` next to
  `scripts/generate_brain_meshes.py` and re-run to switch with no code change.

## Visibility

Region data and annotations are clinician-facing (radiologist edits; physician
reads). They are **never** exposed in the patient/caregiver portals — consistent
with the case-state `patientVisibility` model.
