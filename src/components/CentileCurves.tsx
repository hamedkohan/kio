import { useEffect, useMemo, useState } from "react";
import { Area, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "../i18n";
import { EmptyState, PanelCard } from "./ui";
import type { DemoQuantitativeMetric } from "../data/kio-demo/types";

const PRIORITY_STRUCTURES = [
  "entorhinal", "inferiorparietal", "middletemporal", "fusiform", "precuneus",
  "posteriorcingulate", "parahippocampal", "inferiortemporal", "isthmuscingulate", "superiortemporal",
];

const AGE_MIN = 20;
const AGE_MAX = 85;
const AGE_STEP = 2.5;
const CV = 0.08;
const AGE_DECLINE_PER_YEAR = 0.0022;

const Z = { p5: -1.6448536, p25: -0.6744898, p50: 0, p75: 0.6744898, p95: 1.6448536 };

// Sequential percentile bands, matching the legacy KIO atrophy report colormap
// (p5 → p95). Band = the region BELOW the named percentile line.
const BANDS = [
  { key: "below5", color: "#2563eb", opacity: 0.16 }, // < p5
  { key: "b5_25", color: "#f59e0b", opacity: 0.18 }, // p5–p25
  { key: "b25_50", color: "#16a34a", opacity: 0.16 }, // p25–p50
  { key: "b50_75", color: "#ef4444", opacity: 0.14 }, // p50–p75
  { key: "b75_95", color: "#8b5cf6", opacity: 0.16 }, // p75–p95
  { key: "top95", color: "none", opacity: 0 }, // > p95
] as const;
const CENTILE_LINES = [
  { key: "p5", color: "#2563eb" },
  { key: "p25", color: "#d97706" },
  { key: "p50", color: "#15803d" },
  { key: "p75", color: "#dc2626" },
  { key: "p95", color: "#7c3aed" },
] as const;

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
  below5: number; b5_25: number; b25_50: number; b50_75: number; b75_95: number; top95: number;
  p5: number; p25: number; p50: number; p75: number; p95: number;
};

function buildCentileSeries(value: number, percentile: number, patientAge: number) {
  const z = inverseNormalCdf(percentile / 100);
  const medianAtPatientAge = value / (1 + z * CV);

  const raw = [];
  for (let age = AGE_MIN; age <= AGE_MAX + 1e-9; age += AGE_STEP) {
    const median = medianAtPatientAge * (1 - AGE_DECLINE_PER_YEAR * (age - patientAge));
    const sd = CV * median;
    raw.push({
      age: Math.round(age * 10) / 10,
      p5: median + Z.p5 * sd, p25: median + Z.p25 * sd, p50: median, p75: median + Z.p75 * sd, p95: median + Z.p95 * sd,
    });
  }

  const minP5 = Math.min(...raw.map((r) => r.p5));
  const maxP95 = Math.max(...raw.map((r) => r.p95));
  const range = maxP95 - minP5 || 1;
  const yMin = Math.min(minP5 - range * 0.6, value * 0.94);
  const yMax = Math.max(maxP95 + range * 0.25, value * 1.06);

  const rows: CentileRow[] = raw.map((r) => ({
    age: r.age,
    below5: r.p5,
    b5_25: r.p25 - r.p5,
    b25_50: r.p50 - r.p25,
    b50_75: r.p75 - r.p50,
    b75_95: r.p95 - r.p75,
    top95: yMax - r.p95,
    p5: r.p5, p25: r.p25, p50: r.p50, p75: r.p75, p95: r.p95,
  }));

  return { rows, yMin, yMax };
}

type AttentionLevel = "outlier" | "watch" | "normal";
function attentionFor(metric: DemoQuantitativeMetric): { level: AttentionLevel; score: number; needsAttention: boolean } {
  const pct = metric.percentile ?? 50;
  const changeAbs = Math.abs(metric.change_percent ?? 0);
  const outlier = pct < 5 || pct > 95;
  const watch = !outlier && (pct < 25 || pct > 75 || changeAbs >= 5);
  const level: AttentionLevel = outlier ? "outlier" : watch ? "watch" : "normal";
  const score = (outlier ? 1000 : 0) + (watch ? 100 : 0) + changeAbs;
  return { level, score, needsAttention: outlier || watch };
}

function BandTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CentileRow }> }) {
  const { t, formatNumber } = useI18n();
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="centile-tip">
      <strong>{t("Age")} {formatNumber(row.age)}</strong>
      <div dir="ltr">p5 {row.p5.toFixed(2)} · p25 {row.p25.toFixed(2)} · p50 {row.p50.toFixed(2)}</div>
      <div dir="ltr">p75 {row.p75.toFixed(2)} · p95 {row.p95.toFixed(2)} mm</div>
    </div>
  );
}

function CentileChart({ metric, patientAge, variant }: { metric: DemoQuantitativeMetric; patientAge: number; variant: "mini" | "detail" }) {
  const { t, formatNumber } = useI18n();
  const percentile = metric.percentile ?? 50;
  const { rows, yMin, yMax } = useMemo(() => buildCentileSeries(metric.value, percentile, patientAge), [metric.value, percentile, patientAge]);
  const hasPrevious = metric.previous_value !== null && metric.previous_value !== undefined;
  const prevX = Math.max(AGE_MIN, patientAge - 1.2);
  const detail = variant === "detail";
  const height = detail ? 380 : 96;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={detail ? { top: 16, right: 20, bottom: 6, left: 4 } : { top: 6, right: 6, bottom: 0, left: -26 }}>
        <XAxis dataKey="age" type="number" domain={[AGE_MIN, AGE_MAX]} ticks={detail ? [20, 30, 40, 50, 60, 70, 80] : [20, 50, 80]} tick={{ fontSize: detail ? 11 : 8 }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} label={detail ? { value: t("Age"), position: "insideBottom", offset: -2, fontSize: 11 } : undefined} />
        <YAxis domain={[Number(yMin.toFixed(2)), Number(yMax.toFixed(2))]} tick={{ fontSize: detail ? 11 : 8 }} tickLine={false} axisLine={false} width={detail ? 44 : 30} tickFormatter={(v: number) => v.toFixed(1)} label={detail ? { value: t("Cortical thickness (mm)"), angle: -90, position: "insideLeft", fontSize: 11 } : undefined} />
        {detail ? <Tooltip content={<BandTooltip />} cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} /> : null}
        {BANDS.map((band) => (
          <Area key={band.key} type="linear" dataKey={band.key} stackId="band" stroke="none" fill={band.color} fillOpacity={band.opacity} isAnimationActive={false} activeDot={false} />
        ))}
        {detail
          ? CENTILE_LINES.map((line) => <Line key={line.key} type="linear" dataKey={line.key} stroke={line.color} strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} strokeOpacity={0.7} />)
          : <Line type="linear" dataKey="p50" stroke="#15803d" strokeWidth={1} strokeDasharray="4 3" dot={false} activeDot={false} isAnimationActive={false} />}
        {detail ? <ReferenceLine x={patientAge} stroke="#0f172a" strokeDasharray="2 2" strokeOpacity={0.4} ifOverflow="extendDomain" /> : null}
        {hasPrevious ? <ReferenceLine ifOverflow="extendDomain" segment={[{ x: prevX, y: metric.previous_value as number }, { x: patientAge, y: metric.value }]} stroke="#0f172a" strokeWidth={1} /> : null}
        {hasPrevious ? <ReferenceDot x={prevX} y={metric.previous_value as number} r={detail ? 5 : 3} fill="#fff" stroke="#0f172a" strokeWidth={1.5} ifOverflow="extendDomain" label={detail && metric.previous_percentile != null ? { value: `p${formatNumber(metric.previous_percentile)}`, position: "bottom", fontSize: 10, fill: "#475569" } : undefined} /> : null}
        <ReferenceDot x={patientAge} y={metric.value} r={detail ? 6 : 4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} ifOverflow="extendDomain" label={detail ? { value: `${metric.value} (p${formatNumber(percentile)})`, position: "top", fontSize: 11, fill: "#b91c1c", fontWeight: 700 } : undefined} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CentileCard({ metric, patientAge, onOpen }: { metric: DemoQuantitativeMetric; patientAge: number; onOpen: () => void }) {
  const { t, tv, formatNumber } = useI18n();
  const percentile = metric.percentile ?? 50;
  const change = metric.change_percent ?? null;
  const { level } = attentionFor(metric);
  return (
    <button type="button" className={`centile-card level-${level}`} onClick={onOpen} aria-label={`${tv(metric.structure)} ${t("details")}`}>
      <div className="centile-head">
        <strong>{tv(metric.structure)}</strong>
        {level !== "normal" ? <span className={`centile-badge ${level}`}>{level === "outlier" ? t("Outlier") : t("Watch")}</span> : null}
      </div>
      <div className="centile-vals">
        <span dir="ltr">{metric.value} {metric.unit} · p{formatNumber(percentile)}</span>
        {change !== null ? <span className={`centile-change ${change < 0 ? "down" : "up"}`} dir="ltr">{change < 0 ? "▼" : "▲"} {Math.abs(change)}%</span> : null}
      </div>
      <CentileChart metric={metric} patientAge={patientAge} variant="mini" />
      <span className="centile-expand-hint">{t("Click to expand")}</span>
    </button>
  );
}

function CentileModal({ metric, patientAge, onClose }: { metric: DemoQuantitativeMetric; patientAge: number; onClose: () => void }) {
  const { t, tv, formatNumber } = useI18n();
  const percentile = metric.percentile ?? 50;
  const change = metric.change_percent ?? null;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="centile-modal-backdrop" onClick={onClose} role="presentation">
      <div className="centile-modal" role="dialog" aria-modal="true" aria-label={tv(metric.structure)} onClick={(event) => event.stopPropagation()}>
        <header className="centile-modal-head">
          <div>
            <h3>{tv(metric.structure)} · {t(metric.hemisphere[0].toUpperCase() + metric.hemisphere.slice(1))}</h3>
            <p dir="ltr">
              {t("Current")}: {metric.value} {metric.unit} (p{formatNumber(percentile)})
              {metric.previous_value != null ? ` · ${t("Previous")}: ${metric.previous_value} ${metric.unit}${metric.previous_percentile != null ? ` (p${formatNumber(metric.previous_percentile)})` : ""}` : ""}
              {change != null ? ` · ${change < 0 ? "▼" : "▲"} ${Math.abs(change)}%` : ""}
            </p>
          </div>
          <button type="button" className="centile-modal-close" onClick={onClose} aria-label={t("Close")}>×</button>
        </header>
        <CentileChart metric={metric} patientAge={patientAge} variant="detail" />
        <CentileLegend detailed />
        <p className="centile-axis-note">{t("Click anywhere outside this card, or press Esc, to close.")}</p>
      </div>
    </div>
  );
}

function CentileLegend({ detailed = false }: { detailed?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="centile-legend">
      <span><i style={{ background: "#2563eb" }} /> {detailed ? "p5" : t("Outlier (<5 / >95)")}</span>
      {detailed ? <span><i style={{ background: "#f59e0b" }} /> p25</span> : null}
      <span><i style={{ background: detailed ? "#16a34a" : "#f59e0b" }} /> {detailed ? "p50" : "5–95"}</span>
      {detailed ? <span><i style={{ background: "#ef4444" }} /> p75</span> : null}
      {detailed ? <span><i style={{ background: "#8b5cf6" }} /> p95</span> : null}
      <span><i className="lg-dot" /> {t("Current")}</span>
      <span><i className="lg-dot-prev" /> {t("Previous")}</span>
    </div>
  );
}

export function CentileCurvesSection({ corticometryMetrics, patientAge }: { corticometryMetrics: DemoQuantitativeMetric[]; patientAge: number }) {
  const { t, formatNumber } = useI18n();
  const hemispheres = useMemo(() => {
    const set = new Set(corticometryMetrics.map((m) => m.hemisphere));
    return ["total", "left", "right"].filter((h) => set.has(h));
  }, [corticometryMetrics]);
  const [hemisphere, setHemisphere] = useState(hemispheres[0] ?? "total");
  const [onlyAttention, setOnlyAttention] = useState(true);
  const [openMetric, setOpenMetric] = useState<DemoQuantitativeMetric | null>(null);

  const sortedStructures = useMemo(() => {
    const byStructure = new Map<string, DemoQuantitativeMetric>();
    corticometryMetrics
      .filter((m) => m.hemisphere === hemisphere && m.percentile !== null && m.percentile !== undefined)
      .forEach((m) => { if (!byStructure.has(m.structure)) byStructure.set(m.structure, m); });
    return [...byStructure.values()].sort((a, b) => {
      const diff = attentionFor(b).score - attentionFor(a).score;
      if (diff) return diff;
      const ai = PRIORITY_STRUCTURES.indexOf(a.structure.toLowerCase());
      const bi = PRIORITY_STRUCTURES.indexOf(b.structure.toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.structure.localeCompare(b.structure);
    });
  }, [corticometryMetrics, hemisphere]);

  const attentionCount = useMemo(() => sortedStructures.filter((m) => attentionFor(m).needsAttention).length, [sortedStructures]);

  if (!corticometryMetrics.length) {
    return (
      <PanelCard title="Reference centile curves" subtitle="Cortical thickness vs age">
        <EmptyState title={t("No corticometry module")} message={t("This selected case does not include a corticometry module.")} />
      </PanelCard>
    );
  }

  const effectiveOnlyAttention = onlyAttention && attentionCount > 0;
  const display = effectiveOnlyAttention ? sortedStructures.filter((m) => attentionFor(m).needsAttention) : sortedStructures;

  return (
    <PanelCard title="Reference centile curves" subtitle="Cortical thickness vs age — prioritised by clinical attention. Click a card for the detailed chart.">
      <div className="centile-toolbar">
        <div className="segmented" role="tablist" aria-label={t("Hemisphere")}>
          {hemispheres.map((h) => (
            <button key={h} type="button" role="tab" aria-selected={h === hemisphere} className={h === hemisphere ? "active" : ""} onClick={() => setHemisphere(h)}>
              {t(h[0].toUpperCase() + h.slice(1))}
            </button>
          ))}
        </div>
        <div className="segmented" role="tablist" aria-label={t("Filter")}>
          <button type="button" role="tab" aria-selected={effectiveOnlyAttention} className={effectiveOnlyAttention ? "active" : ""} onClick={() => setOnlyAttention(true)} disabled={attentionCount === 0}>
            {t("Needs attention")} · {formatNumber(attentionCount)}
          </button>
          <button type="button" role="tab" aria-selected={!effectiveOnlyAttention} className={!effectiveOnlyAttention ? "active" : ""} onClick={() => setOnlyAttention(false)}>
            {t("All")} · {formatNumber(sortedStructures.length)}
          </button>
        </div>
      </div>
      <CentileLegend />
      {display.length ? (
        <div className="centile-grid">
          {display.map((metric) => <CentileCard key={metric.metric_id} metric={metric} patientAge={patientAge} onOpen={() => setOpenMetric(metric)} />)}
        </div>
      ) : (
        <EmptyState title={t("No structures to show")} message={t("No corticometry structures match the current filter.")} />
      )}
      <div className="ai-boundary">
        <strong>{t("About this reference model")}</strong>
        <p>{t("Percentile bands follow the legacy KIO atrophy report method (p5/p25/p50/p75/p95). Values are currently modelled and anchored to each reported percentile; they will be replaced by the normative curves delivered from the AI pipeline API.")}</p>
      </div>
      {openMetric ? <CentileModal metric={openMetric} patientAge={patientAge} onClose={() => setOpenMetric(null)} /> : null}
    </PanelCard>
  );
}
