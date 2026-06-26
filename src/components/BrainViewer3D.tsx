import { useEffect, useRef, useState } from "react";
import { Niivue } from "@niivue/niivue";
import { useI18n } from "../i18n";
import { PanelCard } from "./ui";

type Status = "loading" | "ready" | "error";

// Real WebGL 3D mesh viewer (NiiVue). Rotatable/zoomable by mouse.
// `meshUrl` defaults to a self-hosted sample so it always renders; the pipeline's
// real cortical surface (and per-region atrophy values) will replace it via the API.
export function BrainViewer3D({ meshUrl, title = "3D brain", subtitle = "Rotatable cortical surface — drag to rotate, scroll to zoom" }: { meshUrl?: string; title?: string; subtitle?: string }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const url = meshUrl ?? `${import.meta.env.BASE_URL}demo-data/mesh/brain-demo.ply`;

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
        nv.setRenderAzimuthElevation(120, 15);
        nv.drawScene();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

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
      </div>
      <div className="ai-boundary">
        <strong>{t("Demo brain (illustrative)")}</strong>
        <p>{t("Real WebGL 3D engine (NiiVue). This demo surface is coloured per region by this case's percentile data (red = low percentile / atrophied). Anatomy is illustrative; upload your pipeline's cortical mesh (.mz3 / .gii / FreeSurfer) for the true brain with real region mapping and radiologist annotation.")}</p>
      </div>
    </PanelCard>
  );
}
