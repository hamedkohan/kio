import { useEffect, useRef, useState } from "react";
import { Niivue } from "@niivue/niivue";
import { useI18n } from "../i18n";
import { PanelCard } from "./ui";

type Status = "loading" | "ready" | "error";

export type BrainMarker = { name: string; x: number; y: number; z: number; severity: string };

// Real WebGL 3D mesh viewer (NiiVue). Rotatable/zoomable by mouse.
// Loads a per-case PLY (per-vertex Desikan-Killiany colour) and overlays optional
// radiologist annotation markers (sphere nodes at region centroids) without
// replacing the cortical surface.
export function BrainViewer3D({
  meshUrl,
  hasRegionalMap = true,
  markers = [],
  parcellationSource = "approximate_demo",
  title = "3D brain",
  subtitle = "Rotatable cortical surface — drag to rotate, scroll to zoom",
}: {
  meshUrl: string;
  hasRegionalMap?: boolean;
  markers?: BrainMarker[];
  parcellationSource?: string;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerMeshRef = useRef<any>(null);
  const [status, setStatus] = useState<Status>("loading");
  const url = meshUrl;
  const isReal = parcellationSource === "freesurfer_aparc";

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStatus("loading");

    const nv = new Niivue({ backColor: [0.04, 0.07, 0.13, 1], show3Dcrosshair: false, isColorbar: false });
    nvRef.current = nv;

    (async () => {
      try {
        await nv.attachToCanvas(canvas);
        await nv.loadMeshes([{ url }]); // PLY carries per-vertex colours
        if (cancelled) return;
        markerMeshRef.current = null;
        nv.setRenderAzimuthElevation(120, 15);
        nv.drawScene();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  // Overlay / refresh annotation markers as connectome node spheres on the surface.
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || status !== "ready") return;
    try {
      if (markerMeshRef.current) {
        nv.removeMesh(markerMeshRef.current);
        markerMeshRef.current = null;
      }
      if (markers.length) {
        const connectome = {
          name: "annotations",
          nodeColormap: "warm",
          nodeColormapNegative: "winter",
          nodeMinColor: 0,
          nodeMaxColor: 1,
          nodeScale: 1,
          edgeColormap: "warm",
          edgeColormapNegative: "winter",
          edgeMin: 0,
          edgeMax: 1,
          edgeScale: 1,
          nodes: markers.map((m) => ({
            name: m.name,
            x: m.x,
            y: m.y,
            z: m.z,
            colorValue: m.severity === "marked" ? 1 : 0.5,
            sizeValue: m.severity === "marked" ? 5 : 3.5,
          })),
          edges: [],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mesh = nv.loadConnectomeAsMesh(connectome as any);
        nv.addMesh(mesh);
        markerMeshRef.current = mesh;
      }
      nv.drawScene();
    } catch {
      // Markers are best-effort; the annotation list is the source of truth.
    }
  }, [markers, status]);

  const resetView = () => {
    const nv = nvRef.current;
    if (!nv) return;
    nv.setRenderAzimuthElevation(120, 15);
    nv.drawScene();
  };

  return (
    <PanelCard title={title} subtitle={subtitle}>
      <div className="brain3d">
        <canvas ref={canvasRef} className="brain3d-canvas" />
        {status !== "ready" ? (
          <div className="brain3d-overlay">
            {status === "loading" ? <span>{t("Loading 3D model…")}</span> : <span>{t("Could not load the 3D model in this browser.")}</span>}
          </div>
        ) : null}
        <div className="brain3d-controls">
          <button type="button" onClick={resetView} aria-label={t("Reset view")}>⟳</button>
        </div>
        <div className="brain3d-legend">
          <span>{t("Percentile")}</span>
          <i className="brain3d-bar" />
          <small dir="ltr">0</small>
          <small dir="ltr">100</small>
        </div>
        {markers.length ? (
          <div className="brain3d-annot-legend"><i className="brain3d-annot-dot" />{t("Radiologist annotation")}</div>
        ) : null}
      </div>
      <div className="ai-boundary">
        <strong>{hasRegionalMap ? t("Real cortical surface · Desikan-Killiany regions") : t("No regional map for this case")}</strong>
        <p>{hasRegionalMap
          ? (isReal
            ? t("Real FreeSurfer cortical surface coloured per Desikan-Killiany region by THIS case's percentile (red = low percentile / atrophied), shaded by sulcal depth.")
            : t("Real FreeSurfer cortical surface (fsaverage5) coloured per Desikan-Killiany region by THIS case's percentile (red = low percentile / atrophied). Region boundaries are an approximate DK parcellation for the demo; the real parcellation delivered with the pipeline mesh drops in unchanged."))
          : t("This case has no cortical volumetry/corticometry module, so the surface is shown in neutral grey. Cases with regional data are coloured by percentile.")}</p>
      </div>
    </PanelCard>
  );
}
