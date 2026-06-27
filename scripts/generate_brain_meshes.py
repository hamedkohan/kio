#!/usr/bin/env python3
"""Generate per-case cortical surface meshes coloured by Desikan-Killiany (DK) region.

Pipeline (real-data ready):
  1. Load the real fsaverage5 cortical surface bundled with nilearn (pial + sulc).
  2. Assign every vertex to a DK region.
       - If a real FreeSurfer ``?h.aparc.annot`` is available it is used directly
         (drop it next to this script as ``lh.aparc.annot`` / ``rh.aparc.annot``).
       - Otherwise an APPROXIMATE DK parcellation is derived from normalised
         anatomical coordinates (real region names, approximate boundaries). This
         is the demo fallback and is clearly labelled as such in the UI.
  3. Colour each region by THIS case's percentile (red = low / atrophied → light
     = normal), modulated by sulcal depth so gyri/sulci read anatomically.
  4. Export an ASCII PLY with per-vertex colour (NiiVue reads these directly),
     a region-centroid file (for annotation markers), and the per-case imaging
     analysis JSON in the API contract shape.

The approximate parcellation is the ONLY synthetic part; swap in a real annot and
every downstream artefact (colours, centroids, contract JSON) is produced from
real labels with no code change.
"""
from __future__ import annotations

import gzip
import json
import os
from pathlib import Path

import numpy as np
import nibabel as nib

ROOT = Path(__file__).resolve().parent.parent
NILEARN_FS = Path(
    "/usr/local/lib/python3.11/dist-packages/nilearn/datasets/data/fsaverage5"
)
MESH_OUT = ROOT / "public" / "demo-data" / "mesh"
API_OUT = ROOT / "public" / "demo-data" / "api"
SEED = ROOT / "src" / "data" / "kio-demo" / "kio_demo_seed.json"

# Canonical DK cortical regions → approximate normalised anatomical centroid and lobe.
# Normalised axes within each hemisphere bounding box:
#   xn: 0 = medial (near midline)        → 1 = lateral
#   yn: 0 = posterior                    → 1 = anterior
#   zn: 0 = inferior                     → 1 = superior
DK_REGIONS: dict[str, tuple[float, float, float, str]] = {
    # Frontal
    "superiorfrontal": (0.25, 0.80, 0.85, "Frontal"),
    "rostralmiddlefrontal": (0.75, 0.85, 0.60, "Frontal"),
    "caudalmiddlefrontal": (0.80, 0.62, 0.65, "Frontal"),
    "parsopercularis": (0.85, 0.60, 0.40, "Frontal"),
    "parstriangularis": (0.85, 0.70, 0.40, "Frontal"),
    "parsorbitalis": (0.80, 0.82, 0.30, "Frontal"),
    "lateralorbitofrontal": (0.60, 0.85, 0.18, "Frontal"),
    "medialorbitofrontal": (0.18, 0.85, 0.18, "Frontal"),
    "precentral": (0.70, 0.50, 0.70, "Frontal"),
    "paracentral": (0.15, 0.45, 0.92, "Frontal"),
    # Parietal
    "postcentral": (0.70, 0.40, 0.70, "Parietal"),
    "superiorparietal": (0.50, 0.28, 0.85, "Parietal"),
    "inferiorparietal": (0.85, 0.30, 0.50, "Parietal"),
    "supramarginal": (0.88, 0.38, 0.50, "Parietal"),
    "precuneus": (0.15, 0.25, 0.70, "Parietal"),
    # Temporal
    "superiortemporal": (0.90, 0.55, 0.32, "Temporal"),
    "middletemporal": (0.92, 0.50, 0.22, "Temporal"),
    "inferiortemporal": (0.88, 0.50, 0.12, "Temporal"),
    "fusiform": (0.50, 0.45, 0.08, "Temporal"),
    "entorhinal": (0.35, 0.62, 0.05, "Temporal"),
    "parahippocampal": (0.30, 0.45, 0.06, "Temporal"),
    "transversetemporal": (0.70, 0.50, 0.38, "Temporal"),
    "insula": (0.55, 0.55, 0.40, "Temporal"),
    # Occipital
    "lateraloccipital": (0.80, 0.10, 0.35, "Occipital"),
    "lingual": (0.20, 0.12, 0.25, "Occipital"),
    "cuneus": (0.18, 0.08, 0.60, "Occipital"),
    "pericalcarine": (0.12, 0.10, 0.45, "Occipital"),
    # Cingulate
    "rostralanteriorcingulate": (0.10, 0.78, 0.45, "Cingulate"),
    "caudalanteriorcingulate": (0.10, 0.62, 0.60, "Cingulate"),
    "posteriorcingulate": (0.10, 0.38, 0.60, "Cingulate"),
    "isthmuscingulate": (0.10, 0.28, 0.50, "Cingulate"),
}
REGION_NAMES = list(DK_REGIONS.keys())
# Weight medial/lateral separation strongly so medial regions don't bleed laterally.
AXIS_WEIGHTS = np.array([1.6, 1.0, 1.0])


def load_gii(name: str) -> np.ndarray:
    path = NILEARN_FS / name
    with gzip.open(path, "rb") as handle:
        img = nib.GiftiImage.from_bytes(handle.read())
    return np.asarray(img.darrays[0].data)


def load_surface(hemi: str):
    # GIFTI surface: darray[0] = coords, darray[1] = faces
    path = NILEARN_FS / f"pial_{hemi}.gii.gz"
    with gzip.open(path, "rb") as handle:
        img = nib.GiftiImage.from_bytes(handle.read())
    coords = np.asarray(img.darrays[0].data, dtype=np.float64)
    faces = np.asarray(img.darrays[1].data, dtype=np.int64)
    sulc = load_gii(f"sulc_{hemi}.gii.gz").astype(np.float64)
    return coords, faces, sulc


def parcellate(coords: np.ndarray, hemi: str) -> np.ndarray:
    """Assign each vertex to a DK region index (approximate parcellation)."""
    annot = Path(__file__).resolve().parent / f"{hemi[0]}h.aparc.annot"
    if annot.exists():  # real annot drop-in
        labels, _, names = nib.freesurfer.read_annot(str(annot))
        name_to_idx = {n.decode() if isinstance(n, bytes) else n: i for i, n in enumerate(names)}
        out = np.full(len(coords), -1, dtype=np.int64)
        for vi, lab in enumerate(labels):
            rn = (names[lab].decode() if isinstance(names[lab], bytes) else names[lab])
            if rn in DK_REGIONS:
                out[vi] = REGION_NAMES.index(rn)
        return out

    # Approximate: normalise coords within hemisphere bbox, nearest weighted centroid.
    x = np.abs(coords[:, 0])  # lateral distance from midline
    y = coords[:, 1]
    z = coords[:, 2]

    def norm(a):
        lo, hi = np.percentile(a, 1), np.percentile(a, 99)
        return np.clip((a - lo) / (hi - lo + 1e-9), 0, 1)

    pts = np.stack([norm(x), norm(y), norm(z)], axis=1)
    cents = np.array([[DK_REGIONS[r][0], DK_REGIONS[r][1], DK_REGIONS[r][2]] for r in REGION_NAMES])
    # weighted squared distance
    diff = (pts[:, None, :] - cents[None, :, :]) * AXIS_WEIGHTS[None, None, :]
    d2 = np.sum(diff ** 2, axis=2)
    return np.argmin(d2, axis=1)


def percentile_color(p: float) -> np.ndarray:
    """Percentile → RGB. 0 = deep red (atrophied) … 100 = light neutral (normal)."""
    p = max(0.0, min(100.0, p)) / 100.0
    # red (low) → amber (mid) → light grey-green (normal)
    stops = [
        (0.0, np.array([176, 30, 32])),
        (0.5, np.array([224, 170, 78])),
        (1.0, np.array([205, 214, 208])),
    ]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if p <= p1:
            t = (p - p0) / (p1 - p0 + 1e-9)
            return (c0 + (c1 - c0) * t)
    return stops[-1][1]


def case_region_percentiles(seed: dict, case_id: str) -> dict[str, float]:
    """region name → percentile for a case (DK total/mean, lobe fallback)."""
    metrics = [m for m in seed["quantitative_metrics"] if m["case_id"] == case_id]
    out: dict[str, float] = {}
    # DK region level (prefer total, else mean of left/right)
    for region in REGION_NAMES:
        rows = [m for m in metrics if m["structure"] == region and m.get("percentile") is not None]
        tot = [m for m in rows if m["hemisphere"] == "total"]
        lr = [m for m in rows if m["hemisphere"] in ("left", "right")]
        if tot:
            out[region] = float(tot[0]["percentile"])
        elif lr:
            out[region] = float(np.mean([m["percentile"] for m in lr]))
    # Lobe fallback for regions still missing
    lobe_pct: dict[str, float] = {}
    for lobe in {v[3] for v in DK_REGIONS.values()}:
        rows = [m for m in metrics if m["structure"] == lobe and m["hemisphere"] == "total" and m.get("percentile") is not None]
        if rows:
            lobe_pct[lobe] = float(rows[0]["percentile"])
    for region, (_, _, _, lobe) in DK_REGIONS.items():
        if region not in out and lobe in lobe_pct:
            out[region] = lobe_pct[lobe]
    return out


def build_case(seed: dict, case_id: str, hemis):
    region_pct = case_region_percentiles(seed, case_id)
    all_coords, all_faces, all_colors = [], [], []
    centroids: dict[str, dict[str, list[float]]] = {}
    voffset = 0
    for hemi, (coords, faces, sulc, labels) in hemis.items():
        # sulc shading factor (gyri brighter, sulci darker)
        s = (sulc - sulc.mean()) / (sulc.std() + 1e-9)
        shade = np.clip(0.92 - 0.16 * np.tanh(s), 0.72, 1.06)
        colors = np.zeros((len(coords), 3))
        for ri, region in enumerate(REGION_NAMES):
            mask = labels == ri
            if not mask.any():
                continue
            cen = coords[mask].mean(axis=0)
            centroids.setdefault(region, {})[hemi] = [round(float(v), 2) for v in cen]
            if region in region_pct:
                base = percentile_color(region_pct[region])
            else:
                base = np.array([150.0, 156.0, 158.0])  # neutral grey: no data
            colors[mask] = base
        colors = np.clip(colors * shade[:, None], 0, 255)
        all_coords.append(coords)
        all_faces.append(faces + voffset)
        all_colors.append(colors)
        voffset += len(coords)
    V = np.concatenate(all_coords)
    F = np.concatenate(all_faces)
    C = np.concatenate(all_colors).astype(np.uint8)
    return V, F, C, region_pct, centroids


def write_ply(path: Path, V, F, C):
    lines = [
        "ply", "format ascii 1.0",
        f"element vertex {len(V)}",
        "property float x", "property float y", "property float z",
        "property uchar red", "property uchar green", "property uchar blue",
        f"element face {len(F)}",
        "property list uchar int vertex_indices",
        "end_header",
    ]
    body = [f"{v[0]:.3f} {v[1]:.3f} {v[2]:.3f} {c[0]} {c[1]} {c[2]}" for v, c in zip(V, C)]
    body += [f"3 {f[0]} {f[1]} {f[2]}" for f in F]
    path.write_text("\n".join(lines + body) + "\n")


def main():
    seed = json.loads(SEED.read_text())
    MESH_OUT.mkdir(parents=True, exist_ok=True)
    API_OUT.mkdir(parents=True, exist_ok=True)

    real_annot = (Path(__file__).resolve().parent / "lh.aparc.annot").exists()
    hemis = {}
    for hemi in ("left", "right"):
        coords, faces, sulc = load_surface(hemi)
        labels = parcellate(coords, hemi)
        hemis[hemi] = (coords, faces, sulc, labels)

    shared_centroids: dict[str, dict[str, list[float]]] = {}
    for case in seed["cases"]:
        cid = case["case_id"]
        V, F, C, region_pct, centroids = build_case(seed, cid, hemis)
        write_ply(MESH_OUT / f"brain-{cid}.ply", V, F, C)
        shared_centroids = centroids  # geometry is case-independent
        # Per-case imaging-analysis JSON in the API contract shape
        analysis = build_analysis_json(seed, case, region_pct, real_annot)
        (API_OUT / f"analysis-{cid}.json").write_text(json.dumps(analysis, ensure_ascii=False, indent=2))
        print(f"{cid}: {len(V)} verts, {len(region_pct)} regions with data")

    (MESH_OUT / "region_centroids.json").write_text(json.dumps(shared_centroids, ensure_ascii=False, indent=2))
    print(f"parcellation source: {'REAL aparc.annot' if real_annot else 'approximate DK (demo)'}")


def build_analysis_json(seed, case, region_pct, real_annot):
    cid = case["case_id"]
    patient = next((p for p in seed["patients"] if p["patient_id"] == case["patient_id"]), {})
    metrics = [m for m in seed["quantitative_metrics"] if m["case_id"] == cid]
    regions = []
    for region, pct in sorted(region_pct.items(), key=lambda kv: kv[1]):
        rows = [m for m in metrics if m["structure"] == region]
        vol = next((m for m in rows if m["measure"] == "volume"), None)
        thick = next((m for m in rows if m["measure"] == "cortical_thickness"), None)
        src = vol or thick or (rows[0] if rows else None)
        regions.append({
            "region": region,
            "atlas": "desikan-killiany",
            "percentile": round(pct, 1),
            "z_score": round((pct - 50) / 20.0, 2),
            "value": (src or {}).get("value"),
            "unit": (src or {}).get("unit"),
            "previous_value": (src or {}).get("previous_value"),
            "change_percent": (src or {}).get("change_percent"),
            "flagged": pct < 5 or pct > 95,
        })
    # Seed annotations from the most atrophied regions (radiologist starting point).
    annotations = [
        {
            "region": r["region"],
            "hemisphere": "total",
            "severity": "marked" if r["percentile"] < 2 else "mild",
            "note": "Low normative percentile — review for atrophy.",
            "author_role": "radiologist",
            "status": "suggested",
        }
        for r in regions if r["flagged"] and r["percentile"] < 5
    ][:3]
    return {
        "schema_version": "1.0",
        "case_id": cid,
        "study": {
            "study_date": case.get("study_date"),
            "comparison_study_date": next((m.get("comparison_study_date") for m in metrics if m.get("comparison_study_date")), None),
            "modality": "MRI",
            "primary_module": case.get("primary_module"),
        },
        "patient": {
            "age_at_study": patient.get("age_at_study"),
            "sex": patient.get("sex"),
        },
        "qc": {
            "status": "acceptable",
            "motion": "within tolerance",
            "coverage": "complete",
        },
        "mesh": {
            "surface_url": f"demo-data/mesh/brain-{cid}.ply",
            "centroids_url": "demo-data/mesh/region_centroids.json",
            "parcellation": "desikan-killiany",
            "parcellation_source": "freesurfer_aparc" if real_annot else "approximate_demo",
            "space": "fsaverage5",
        },
        "regions": regions,
        "annotations": annotations,
        "provenance": {
            "pipeline": "NeuroTrack morphometry (mock)",
            "generated_by": "scripts/generate_brain_meshes.py",
        },
    }


if __name__ == "__main__":
    main()
