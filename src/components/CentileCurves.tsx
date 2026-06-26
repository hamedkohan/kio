import { useMemo, useState } from "react";
import { Area, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard } from "./ui";
import type { DemoQuantitativeMetric } from "../data/kio-demo/types";

// AD-relevant cortical regions shown first; the rest are available behind "view all".
const PRIORITY_STRUCTURES = [
  "entorhinal",
  "inferiorparietal",
  "middletemporal",
  "fusiform",
  "precuneus",
  "posteriorcingulate",
  "parahippocampal",
  "inferiortemporal",
  "isthmuscingulate",
  "superiortemporal",
];

const AGE_MIN = 20;
const AGE_MAX = 85;
const AGE_STEP = 2.5;
const CV = 0.08; // coefficient of variation for the modelled normative band
const AGE_DECLINE_PER_YEAR = 0.0022; // relative cortical-thickness decline with age

const Z = { p5: -1.6448536, p25: -0.6744898, p50: 0, p75: 0.6744898, p95: 1.6448536 };

// Acklam's rational approximation of the inverse normal CDF (probit).
function inverseNormalCdf(p: number): number {
  const clamped = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (clamped < pLow) {
    q = Math.sqrt(-2 * Math.log(clamped));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (clamped <= pHigh) {
    q = clamped - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - clamped));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

type CentileRow = {
  age: number;
  rBelow5: number;
  a5_25: number;
  g25_75: number;
  a75_95: number;
  r95Top: number;
  p50: number;
};

function buildCentileSeries(value: number, percentile: number, patientAge: number) {
  const z = inverseNormalCdf(percentile / 100);
  // Anchor the median so the patient's value lands exactly on its reported percentile.
  const medianAtPatientAge = value / (1 + z * CV);

  const raw: Array<{ age: number; p5: number; p25: number; p50: number; p75: number; p95: number }> = [];
  for (let age = AGE_MIN; age <= AGE_MAX + 1e-9; age += AGE_STEP) {
    const median = medianAtPatientAge * (1 - AGE_DECLINE_PER_YEAR * (age - patientAge));
    const sd = CV * median;
    raw.push({
      age: Math.round(age * 10) / 10,
      p5: median + Z.p5 * sd,
      p25: median + Z.p25 * sd,
      p50: median,
      p75: median + Z.p75 * sd,
      p95: median + Z.p95 * sd,
    });
  }

  const yMin = Math.min(...raw.map((row) => row.p5), value) * 0.96;
  const yMax = Math.max(...raw.map((row) => row.p95), value) * 1.04;

  const rows: CentileRow[] = raw.map((row) => ({
    age: row.age,
    rBelow5: row.p5,
    a5_25: row.p25 - row.p5,
    g25_75: row.p75 - row.p25,
    a75_95: row.p95 - row.p75,
    r95Top: yMax - row.p95,
    p50: row.p50,
  }));

  return { rows, yMin, yMax };
}

function CentileCurveChart({ metric, patientAge }: { metric: DemoQuantitativeMetric; patientAge: number }) {
  const { t, tv, formatNumber } = useI18n();
  const percentile = metric.percentile ?? 50;
  const { rows, yMin, yMax } = useMemo(() => buildCentileSeries(metric.value, percentile, patientAge), [metric.value, percentile, patientAge]);
  const hasPrevious = metric.previous_value !== null && metric.previous_value !== undefined;

  return (
    <figure className="centile-chart">
      <figcaption>
        <strong>{tv(metric.structure)}</strong>
        <span dir="ltr">{metric.value} {metric.unit} · p{formatNumber(percentile)}</span>
      </figcaption>
      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 2, left: -18 }}>
          <XAxis dataKey="age" type="number" domain={[AGE_MIN, AGE_MAX]} ticks={[20, 40, 60, 80]} tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
          <YAxis domain={[Number(yMin.toFixed(2)), Number(yMax.toFixed(2))]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={34} tickFormatter={(value: number) => value.toFixed(1)} />
          <Area type="linear" dataKey="rBelow5" stackId="band" stroke="none" fill="#dc2626" fillOpacity={0.16} isAnimationActive={false} />
          <Area type="linear" dataKey="a5_25" stackId="band" stroke="none" fill="#f59e0b" fillOpacity={0.18} isAnimationActive={false} />
          <Area type="linear" dataKey="g25_75" stackId="band" stroke="none" fill="#16a34a" fillOpacity={0.16} isAnimationActive={false} />
          <Area type="linear" dataKey="a75_95" stackId="band" stroke="none" fill="#f59e0b" fillOpacity={0.18} isAnimationActive={false} />
          <Area type="linear" dataKey="r95Top" stackId="band" stroke="none" fill="#dc2626" fillOpacity={0.16} isAnimationActive={false} />
          <Line type="linear" dataKey="p50" stroke="#475569" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          {hasPrevious ? (
            <ReferenceLine
              ifOverflow="extendDomain"
              segment={[{ x: Math.max(AGE_MIN, patientAge - 1.2), y: metric.previous_value as number }, { x: patientAge, y: metric.value }]}
              stroke="#0f172a"
              strokeWidth={1}
            />
          ) : null}
          {hasPrevious ? (
            <ReferenceDot x={Math.max(AGE_MIN, patientAge - 1.2)} y={metric.previous_value as number} r={3} fill="#fff" stroke="#0f172a" strokeWidth={1.5} ifOverflow="extendDomain" />
          ) : null}
          <ReferenceDot x={patientAge} y={metric.value} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} ifOverflow="extendDomain" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="centile-axis-note">{t("Cortical thickness (mm) vs age")}</p>
    </figure>
  );
}

export function CentileCurvesSection({ corticometryMetrics, patientAge }: { corticometryMetrics: DemoQuantitativeMetric[]; patientAge: number }) {
  const { t } = useI18n();
  const hemispheres = useMemo(() => {
    const set = new Set(corticometryMetrics.map((metric) => metric.hemisphere));
    return ["total", "left", "right"].filter((hemi) => set.has(hemi));
  }, [corticometryMetrics]);
  const [hemisphere, setHemisphere] = useState(hemispheres[0] ?? "total");

  const structuresForHemi = useMemo(() => {
    const byStructure = new Map<string, DemoQuantitativeMetric>();
    corticometryMetrics
      .filter((metric) => metric.hemisphere === hemisphere && metric.percentile !== null && metric.percentile !== undefined)
      .forEach((metric) => {
        if (!byStructure.has(metric.structure)) byStructure.set(metric.structure, metric);
      });
    const list = [...byStructure.values()];
    return list.sort((a, b) => {
      const ai = PRIORITY_STRUCTURES.indexOf(a.structure.toLowerCase());
      const bi = PRIORITY_STRUCTURES.indexOf(b.structure.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.structure.localeCompare(b.structure);
    });
  }, [corticometryMetrics, hemisphere]);

  if (!corticometryMetrics.length) {
    return (
      <PanelCard title="Reference centile curves" subtitle="Cortical thickness vs age">
        <EmptyState title={t("No corticometry module")} message={t("This selected case does not include a corticometry module.")} />
      </PanelCard>
    );
  }

  const primary = structuresForHemi.slice(0, 6);
  const rest = structuresForHemi.slice(6);

  return (
    <PanelCard title="Reference centile curves" subtitle="Cortical thickness vs age, with the patient point on the normative band">
      <div className="centile-toolbar">
        <div className="segmented" role="tablist" aria-label={t("Hemisphere")}>
          {hemispheres.map((hemi) => (
            <button key={hemi} type="button" role="tab" aria-selected={hemi === hemisphere} className={hemi === hemisphere ? "active" : ""} onClick={() => setHemisphere(hemi)}>
              {t(hemi[0].toUpperCase() + hemi.slice(1))}
            </button>
          ))}
        </div>
        <div className="centile-legend">
          <span><i className="lg-red" /> {t("Outlier (<5 / >95)")}</span>
          <span><i className="lg-amber" /> 5–25 · 75–95</span>
          <span><i className="lg-green" /> 25–75</span>
          <span><i className="lg-dot" /> {t("Current")}</span>
          <span><i className="lg-dot-prev" /> {t("Previous")}</span>
        </div>
      </div>
      <div className="centile-grid">
        {primary.map((metric) => <CentileCurveChart key={metric.metric_id} metric={metric} patientAge={patientAge} />)}
      </div>
      {rest.length ? (
        <details className="progressive-metrics">
          <summary>{t("View all structures")} ({rest.length})</summary>
          <div className="centile-grid">
            {rest.map((metric) => <CentileCurveChart key={metric.metric_id} metric={metric} patientAge={patientAge} />)}
          </div>
        </details>
      ) : null}
      <div className="ai-boundary">
        <strong>{t("About this reference model")}</strong>
        <p>{t("Reference bands are currently modelled and anchored to each reported percentile. They will be replaced by the normative curves delivered from the AI pipeline API.")}</p>
      </div>
    </PanelCard>
  );
}
