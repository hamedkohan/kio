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

## Running against a real backend (reference server)

A runnable reference implementation of the contract lives in
`server/imaging-analysis-server.mjs` (no dependencies):

```bash
npm run serve:api            # listens on :8787, serves the contract routes
# then run the app in http mode against it:
VITE_IMAGING_API_MODE=http VITE_IMAGING_API_BASE=http://localhost:8787 npm run dev
```

It exposes `/health`, `/cases`, `/cases/:id/imaging-analysis`, and the mesh
assets, with CORS enabled. A production backend swaps the file reads for a
DB/pipeline source; routes and shape are unchanged. (The GitHub Pages demo is a
static host, so it stays in `mock` mode — this server is for real/local
deployments.)

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
  parcellation (`approximate_demo`). To switch to the official atlas:
  ```bash
  bash scripts/fetch_aparc_annot.sh   # copies fsaverage5 lh/rh.aparc.annot from $FREESURFER_HOME (or URLs)
  npm run gen:meshes                  # regenerates meshes + JSON from the real atlas
  ```
  No code change — the generator detects the annot and flips
  `parcellation_source` to `freesurfer_aparc`.

## AI orchestration

AI is a registry of pluggable modules (`src/data/integrations.ts`) executed by a
runtime (`src/domain/aiOrchestration.ts`). Active modules run a handler over the
analysis; planned modules are skipped registry slots; AI validation gates
downstream modules. A real pipeline replaces a handler body without changing the
orchestration contract. Surfaced in **Operations → Integrations & AI → AI
orchestration runtime**.

## Visibility

Region data and annotations are clinician-facing (radiologist edits; physician
reads). They are **never** exposed in the patient/caregiver portals — consistent
with the case-state `patientVisibility` model.
