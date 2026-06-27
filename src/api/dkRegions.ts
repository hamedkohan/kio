// Human-readable English labels for Desikan-Killiany region machine names.
// Used for display; passed through t() for localisation.
export const DK_REGION_LABELS: Record<string, string> = {
  superiorfrontal: "Superior frontal",
  rostralmiddlefrontal: "Rostral middle frontal",
  caudalmiddlefrontal: "Caudal middle frontal",
  parsopercularis: "Pars opercularis",
  parstriangularis: "Pars triangularis",
  parsorbitalis: "Pars orbitalis",
  lateralorbitofrontal: "Lateral orbitofrontal",
  medialorbitofrontal: "Medial orbitofrontal",
  precentral: "Precentral",
  paracentral: "Paracentral",
  postcentral: "Postcentral",
  superiorparietal: "Superior parietal",
  inferiorparietal: "Inferior parietal",
  supramarginal: "Supramarginal",
  precuneus: "Precuneus",
  superiortemporal: "Superior temporal",
  middletemporal: "Middle temporal",
  inferiortemporal: "Inferior temporal",
  fusiform: "Fusiform",
  entorhinal: "Entorhinal",
  parahippocampal: "Parahippocampal",
  transversetemporal: "Transverse temporal",
  insula: "Insula",
  lateraloccipital: "Lateral occipital",
  lingual: "Lingual",
  cuneus: "Cuneus",
  pericalcarine: "Pericalcarine",
  rostralanteriorcingulate: "Rostral anterior cingulate",
  caudalanteriorcingulate: "Caudal anterior cingulate",
  posteriorcingulate: "Posterior cingulate",
  isthmuscingulate: "Isthmus cingulate",
};

export function dkRegionLabel(region: string): string {
  return DK_REGION_LABELS[region] ?? region.charAt(0).toUpperCase() + region.slice(1);
}
