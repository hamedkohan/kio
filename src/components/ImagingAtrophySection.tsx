import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard, StatusChip } from "./ui";
import { BrainViewer3D, type BrainMarker } from "./BrainViewer3D";
import { dkRegionLabel } from "../api/dkRegions";
import { useImagingAnalysis, type ImagingAnnotation } from "../api/imagingAnalysis";

function severityForPercentile(p: number): "marked" | "mild" {
  return p < 2 ? "marked" : "mild";
}

// Case-driven atrophy evidence backed by the imaging-analysis API contract:
// per-region DK brain + radiologist annotations (markers on the brain) + a
// regional atrophy worklist. `editable` gives the radiologist annotation control;
// the Physician view consumes the same component read-only.
export function ImagingAtrophySection({ caseId, editable = false, title = "3D atrophy brain (Desikan-Killiany)" }: { caseId?: string; editable?: boolean; title?: string }) {
  const { t, formatNumber } = useI18n();
  const { analysis, centroids, meshUrl, loading } = useImagingAnalysis(caseId);
  const [annotations, setAnnotations] = useState<ImagingAnnotation[]>([]);

  // Seed editable annotations from the pipeline's suggested annotations per case.
  useEffect(() => {
    setAnnotations(analysis?.annotations ?? []);
  }, [analysis]);

  const annotatedRegions = useMemo(() => new Set(annotations.map((a) => a.region)), [annotations]);

  const markers = useMemo<BrainMarker[]>(() => {
    const out: BrainMarker[] = [];
    for (const annotation of annotations) {
      const centroid = centroids[annotation.region];
      if (!centroid) continue;
      const sides = annotation.hemisphere === "total" ? (["left", "right"] as const) : ([annotation.hemisphere] as Array<"left" | "right">);
      for (const side of sides) {
        const xyz = centroid[side];
        if (xyz) out.push({ name: dkRegionLabel(annotation.region), x: xyz[0], y: xyz[1], z: xyz[2], severity: annotation.severity });
      }
    }
    return out;
  }, [annotations, centroids]);

  if (loading) {
    return <PanelCard title={title} subtitle="Loading imaging analysis…"><EmptyState title={t("Loading")} message={t("Loading imaging analysis from the pipeline…")} /></PanelCard>;
  }
  if (!analysis) {
    return <PanelCard title={title} subtitle="No imaging analysis"><EmptyState title={t("No imaging analysis")} message={t("No imaging-analysis output is available for this case.")} /></PanelCard>;
  }

  const hasRegional = analysis.regions.length > 0;
  const ranked = [...analysis.regions].sort((a, b) => a.percentile - b.percentile).slice(0, 10);

  const toggleAnnotation = (region: string, percentile: number) => {
    setAnnotations((current) => {
      if (current.some((a) => a.region === region)) return current.filter((a) => a.region !== region);
      return [...current, { region, hemisphere: "total", severity: severityForPercentile(percentile), note: "Radiologist-flagged region.", author_role: "radiologist", status: "confirmed" }];
    });
  };

  const removeAnnotation = (region: string) => setAnnotations((current) => current.filter((a) => a.region !== region));

  return (
    <>
      <BrainViewer3D
        key={meshUrl ?? caseId}
        meshUrl={meshUrl ?? ""}
        hasRegionalMap={hasRegional}
        markers={markers}
        parcellationSource={analysis.mesh.parcellation_source}
        title={title}
        subtitle="Rotatable cortical surface · per-region DK colouring · drag to rotate, scroll to zoom"
      />

      {hasRegional ? (
        <PanelCard title="Regional atrophy (Desikan-Killiany)" subtitle="Most atrophied cortical regions for this case · percentile (red = low)">
          <div className="table-wrap">
            <table className="dk-region-table">
              <thead>
                <tr>
                  <th>{t("Region")}</th>
                  <th>{t("Percentile")}</th>
                  <th>{t("Δ vs prior")}</th>
                  <th>{t("Flag")}</th>
                  {editable ? <th>{t("Annotation")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {ranked.map((region) => {
                  const annotated = annotatedRegions.has(region.region);
                  return (
                    <tr key={region.region} className={annotated ? "dk-row-annotated" : ""}>
                      <td><strong>{t(dkRegionLabel(region.region))}</strong></td>
                      <td>
                        <div className="dk-pct">
                          <span className="dk-pct-bar"><i style={{ width: `${Math.max(2, Math.min(100, region.percentile))}%` }} className={region.percentile < 5 ? "low" : region.percentile < 25 ? "mid" : ""} /></span>
                          <small dir="ltr">P{formatNumber(Math.round(region.percentile))}</small>
                        </div>
                      </td>
                      <td dir="ltr">{region.change_percent != null ? `${region.change_percent > 0 ? "−" : "+"}${Math.abs(region.change_percent).toFixed(1)}%` : "—"}</td>
                      <td>{region.flagged ? <StatusChip label="Attention percentile" tone="attention" /> : <StatusChip label="Within range" tone="ready" />}</td>
                      {editable ? (
                        <td>
                          <button type="button" className={annotated ? "dk-annot-btn active" : "dk-annot-btn"} onClick={() => toggleAnnotation(region.region, region.percentile)}>
                            {annotated ? `✓ ${t("Annotated")}` : t("Annotate")}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelCard>
      ) : null}

      <PanelCard
        title="Radiologist annotations"
        subtitle={editable ? "Flag regions on the brain for the physician handoff" : "Read-only · authored by the radiologist"}
        action={editable && annotations.length ? <button type="button" className="secondary-button" onClick={() => setAnnotations([])}>{t("Clear all")}</button> : undefined}
      >
        {annotations.length ? (
          <ul className="annot-list">
            {annotations.map((annotation) => (
              <li key={annotation.region} className="annot-item">
                <div className="annot-main">
                  <strong>{t(dkRegionLabel(annotation.region))}</strong>
                  <StatusChip label={annotation.severity === "marked" ? "Marked" : "Mild"} tone={annotation.severity === "marked" ? "attention" : "processing"} />
                  <StatusChip label={annotation.status === "confirmed" ? "Confirmed" : "Suggested"} tone={annotation.status === "confirmed" ? "ready" : "neutral"} />
                </div>
                <p>{t(annotation.note)}</p>
                {editable ? <button type="button" className="annot-remove" onClick={() => removeAnnotation(annotation.region)} aria-label={t("Remove annotation")}>✕</button> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("No annotations")} message={editable ? t("Use Annotate on a region above to mark it on the brain for the physician.") : t("The radiologist has not flagged any region for this case.")} />
        )}
        <div className="ai-boundary"><strong>{t("Decision support only")}</strong><p>{t("Annotations are radiologist markers for handoff. They are not a final diagnosis and are not shown in the patient portal.")}</p></div>
      </PanelCard>
    </>
  );
}
