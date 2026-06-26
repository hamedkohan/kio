import { useEffect, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard } from "./ui";
import type { AtrophyMap } from "../data/kio-demo/repository";

const PERCENTILE_TICKS = [100, 95, 75, 50, 25, 5, 0];

function PercentileColorbar() {
  const { t } = useI18n();
  return (
    <div className="atrophy-colorbar" aria-label={t("Percentile colour scale")}>
      <span className="atrophy-colorbar-title">{t("Percentile")}</span>
      <div className="atrophy-colorbar-body">
        <div className="atrophy-colorbar-gradient" />
        <div className="atrophy-colorbar-ticks">
          {PERCENTILE_TICKS.map((tick) => <span key={tick}>{tick}</span>)}
        </div>
      </div>
    </div>
  );
}

export function AtrophyMaps({ map }: { map: AtrophyMap }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!map.available) {
    return (
      <PanelCard title="Atrophy maps" subtitle="AI-rendered cortical atrophy visualisation">
        <EmptyState title={t("No atrophy map module")} message={t("This selected case does not include a 3D atrophy map module.")} />
      </PanelCard>
    );
  }

  const hasViews = map.views.length > 0;
  const currentImage = hasViews ? map.views[selected]?.imageUrl : map.montageUrl;
  const currentLabel = hasViews ? map.views[selected]?.label : t("Multi-view montage");

  return (
    <PanelCard title="Atrophy maps" subtitle="AI-rendered cortical atrophy, coloured by percentile">
      <div className={fullscreen ? "atrophy-viewer fs" : "atrophy-viewer"}>
        <div className="atrophy-stage">
          <TransformWrapper minScale={0.8} maxScale={8} doubleClick={{ mode: "zoomIn" }} wheel={{ step: 0.12 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="atrophy-controls">
                  <button type="button" onClick={() => zoomIn()} aria-label={t("Zoom in")}>+</button>
                  <button type="button" onClick={() => zoomOut()} aria-label={t("Zoom out")}>−</button>
                  <button type="button" onClick={() => resetTransform()} aria-label={t("Reset zoom")}>⟳</button>
                  <button type="button" onClick={() => setFullscreen((value) => !value)} aria-label={t("Toggle fullscreen")}>{fullscreen ? "✕" : "⛶"}</button>
                </div>
                <TransformComponent wrapperClass="atrophy-zoom-wrap" contentClass="atrophy-zoom-content">
                  <img src={currentImage} alt={currentLabel} draggable={false} />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
          <PercentileColorbar />
        </div>
        <p className="atrophy-caption">{currentLabel} · {map.studyDate}</p>
      </div>

      {hasViews ? (
        <div className="atrophy-thumbs">
          {map.views.map((view, index) => (
            <button key={view.label} type="button" className={index === selected ? "active" : ""} onClick={() => setSelected(index)}>
              <img src={view.imageUrl} alt={view.label} loading="lazy" />
              <span>{view.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="ai-boundary">
          <strong>{t("Demo rendering")}</strong>
          <p>{t("The demo shows the pipeline's multi-view montage. The API will deliver each view as a separate selectable image, and later a rotatable 3D surface mesh coloured per region.")}</p>
        </div>
      )}
    </PanelCard>
  );
}
