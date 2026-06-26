import seedJson from "./kio_demo_seed.json";
import assetManifestJson from "./asset_manifest.json";
import type {
  DemoAsset,
  DemoAuditEvent,
  DemoCase,
  DemoCaseDetail,
  DemoCaseSummary,
  DemoFinding,
  DemoPatient,
  DemoQuantitativeMetric,
  DemoReport,
  DemoReportModule,
  DemoRoleVisibility,
  DemoSeed,
  DemoTask,
  DemoUser,
  DemoUserRole,
  DemoVisualScore,
} from "./types";

const seed = seedJson as unknown as DemoSeed;
const assetManifest = assetManifestJson as unknown as DemoAsset[];

export const DEMO_PAGE_RENDER_BASE_URL = "/demo-data/kio/page_renders";

export function getDemoSeed(): DemoSeed {
  return seed;
}

export function getDemoCases(): DemoCase[] {
  return seed.cases;
}

export function getCaseById(caseId: string): DemoCase | undefined {
  return seed.cases.find((caseRecord) => caseRecord.case_id === caseId);
}

export function getPatientById(patientId: string): DemoPatient | undefined {
  return seed.patients.find((patient) => patient.patient_id === patientId);
}

export function getReportsForCase(caseId: string): DemoReport[] {
  return seed.reports.filter((report) => report.case_id === caseId);
}

export function getReportById(reportId: string): DemoReport | undefined {
  return seed.reports.find((report) => report.report_id === reportId);
}

export function getMetricsForReport(reportId: string): DemoQuantitativeMetric[] {
  return seed.quantitative_metrics.filter((metric) => metric.report_id === reportId);
}

export function getMetricsForCase(caseId: string): DemoQuantitativeMetric[] {
  return seed.quantitative_metrics.filter((metric) => metric.case_id === caseId);
}

export function getVisualScoresForReport(reportId: string): DemoVisualScore[] {
  return seed.visual_scores.filter((score) => score.report_id === reportId);
}

export function getVisualScoresForCase(caseId: string): DemoVisualScore[] {
  return seed.visual_scores.filter((score) => score.case_id === caseId);
}

export function getFindingsForReport(reportId: string): DemoFinding[] {
  return seed.findings.filter((finding) => finding.report_id === reportId);
}

export function getFindingsForCase(caseId: string): DemoFinding[] {
  return seed.findings.filter((finding) => finding.case_id === caseId);
}

export function getUsersByRole(role: DemoUserRole): DemoUser[] {
  return seed.users.filter((user) => user.role === role);
}

export function getUserById(userId?: string): DemoUser | undefined {
  if (!userId) return undefined;
  return seed.users.find((user) => user.user_id === userId);
}

export function getReportModuleById(moduleId: string): DemoReportModule | undefined {
  return seed.report_modules.find((module) => module.module_id === moduleId);
}

export function getReportModulesForCase(caseId: string): DemoReportModule[] {
  return getReportsForCase(caseId)
    .map((report) => getReportModuleById(report.report_type) ?? getReportModuleById(report.module))
    .filter((module): module is DemoReportModule => Boolean(module));
}

export function getOutlierMetricsForCase(caseId: string): DemoQuantitativeMetric[] {
  return getMetricsForCase(caseId).filter(isOutlierMetric);
}

export function getLongitudinalMetricsForCase(caseId: string): DemoQuantitativeMetric[] {
  return getMetricsForCase(caseId).filter((metric) => metric.previous_value !== null && metric.previous_value !== undefined);
}

export function getTasksForCase(caseId: string): DemoTask[] {
  return seed.tasks.filter((task) => task.case_id === caseId);
}

export function getAuditEventsForCase(caseId: string): DemoAuditEvent[] {
  return seed.audit_events.filter((event) => event.case_id === caseId);
}

export function getAssetsForReport(report: DemoReport): DemoAsset[] {
  return assetManifest.filter((asset) => asset.module === report.report_type || asset.module === report.module || asset.source_pdf === report.source_pdf);
}

export function getAssetsForCase(caseId: string): DemoAsset[] {
  const reports = getReportsForCase(caseId);
  return reports.flatMap(getAssetsForReport);
}

export function getAssetUrl(asset: DemoAsset): string {
  return `${DEMO_PAGE_RENDER_BASE_URL}/${asset.path.split("/").pop()}`;
}

export function getDemoCaseSummaries(): DemoCaseSummary[] {
  return seed.cases.map((caseRecord) => {
    const patient = requirePatient(caseRecord.patient_id);
    const reports = getReportsForCase(caseRecord.case_id);
    const metrics = getMetricsForCase(caseRecord.case_id);
    const visualScores = getVisualScoresForCase(caseRecord.case_id);
    return {
      caseRecord,
      patient,
      reports,
      modules: getReportModulesForCase(caseRecord.case_id),
      owner: getUserById(caseRecord.current_owner_user_id),
      metricCount: metrics.length,
      outlierCount: metrics.filter(isOutlierMetric).length,
      visualScoreCount: visualScores.length,
      longitudinal: metrics.some((metric) => metric.previous_value !== null && metric.previous_value !== undefined),
      lastUpdated: latestCaseDate(caseRecord, reports),
    };
  });
}

export function getDemoCaseDetail(caseId: string): DemoCaseDetail | undefined {
  const caseRecord = getCaseById(caseId);
  if (!caseRecord) return undefined;
  const summary = getDemoCaseSummaries().find((item) => item.caseRecord.case_id === caseId);
  if (!summary) return undefined;
  const metrics = getMetricsForCase(caseId);
  return {
    ...summary,
    metrics,
    outlierMetrics: metrics.filter(isOutlierMetric),
    visualScores: getVisualScoresForCase(caseId),
    findings: getFindingsForCase(caseId),
    tasks: getTasksForCase(caseId),
    auditEvents: getAuditEventsForCase(caseId),
    sourceAssets: getAssetsForCase(caseId),
  };
}

export function getMetricGroupsForReport(reportId: string): Record<string, DemoQuantitativeMetric[]> {
  return groupMetricsByStructure(getMetricsForReport(reportId));
}

export function getVisibleCaseDataForRole(caseId: string, role: DemoUserRole): DemoRoleVisibility | undefined {
  const detail = getDemoCaseDetail(caseId);
  if (!detail) return undefined;
  const patientSafe = role === "patient" || role === "caregiver";
  const research = role === "researcher" || role === "data_steward_research_admin";
  const operations = role === "operations_coordinator" || role === "organization_admin";
  const clinical = role === "radiologist" || role === "neurologist_physician" || role === "referring_physician" || role === "psychologist_guest_reviewer";
  const technical = role === "mri_scientist_ai_qa";
  return {
    role,
    caseSummary: detail,
    canSeePatientIdentity: !research,
    canSeeClinicalFindings: clinical && !patientSafe,
    canSeeRawMetrics: (clinical || technical) && !patientSafe,
    canSeeVisualScores: (role === "radiologist" || role === "neurologist_physician" || role === "psychologist_guest_reviewer") && !patientSafe,
    canSeeSourcePages: !patientSafe && !research,
    patientSafeOnly: patientSafe,
  };
}

export function isOutlierMetric(metric: DemoQuantitativeMetric): boolean {
  return metric.is_outlier || (metric.percentile !== null && metric.percentile !== undefined && (metric.percentile < 5 || metric.percentile > 95));
}

export function isPublishedForPatient(caseRecord: DemoCase, patient?: DemoPatient): boolean {
  return caseRecord.publication_state === "patient_summary_published" || patient?.visibility_status === "published_patient_safe_summary_only";
}

export function getSafePatientDemoCases(): DemoCaseDetail[] {
  return seed.cases.map((caseRecord) => getDemoCaseDetail(caseRecord.case_id)).filter((detail): detail is DemoCaseDetail => Boolean(detail));
}

export function getResearchDemoCases(): Array<DemoCaseSummary & { researchCaseId: string; ageBucket: string }> {
  return getDemoCaseSummaries().map((summary, index) => ({
    ...summary,
    researchCaseId: `KIO-DEID-${String(index + 1).padStart(3, "0")}`,
    ageBucket: getAgeBucket(summary.patient.age_at_study),
  }));
}

export function groupMetricsByStructure(metrics: DemoQuantitativeMetric[]): Record<string, DemoQuantitativeMetric[]> {
  return metrics.reduce<Record<string, DemoQuantitativeMetric[]>>((groups, metric) => {
    const key = metric.structure;
    groups[key] = [...(groups[key] ?? []), metric];
    return groups;
  }, {});
}

export function getKeyMetrics(metrics: DemoQuantitativeMetric[]): DemoQuantitativeMetric[] {
  const keyTerms = ["CSF", "Brain", "ICV", "Hippocampus", "HOC", "Temporal", "Parietal", "Frontal", "Lateral-Ventricle", "Inf-Lat-Vent"];
  const prioritized = metrics.filter((metric) => keyTerms.some((term) => metric.structure.toLowerCase().includes(term.toLowerCase())));
  return sortMetricsForReview([...prioritized, ...metrics.filter(isOutlierMetric)]).filter(uniqueMetric).slice(0, 18);
}

export function sortMetricsForReview(metrics: DemoQuantitativeMetric[]): DemoQuantitativeMetric[] {
  return [...metrics].sort((a, b) => {
    const aScore = Math.abs(a.change_percent ?? 0) + (isOutlierMetric(a) ? 100 : 0);
    const bScore = Math.abs(b.change_percent ?? 0) + (isOutlierMetric(b) ? 100 : 0);
    return bScore - aScore;
  });
}

function uniqueMetric(metric: DemoQuantitativeMetric, index: number, list: DemoQuantitativeMetric[]): boolean {
  return list.findIndex((candidate) => candidate.metric_id === metric.metric_id) === index;
}

function requirePatient(patientId: string): DemoPatient {
  const patient = getPatientById(patientId);
  if (!patient) throw new Error(`Missing demo patient ${patientId}`);
  return patient;
}

function latestCaseDate(caseRecord: DemoCase, reports: DemoReport[]): string {
  return [caseRecord.study_date, ...reports.map((report) => report.report_date)].sort().at(-1) ?? caseRecord.study_date;
}

function getAgeBucket(age: number): string {
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  if (age < 70) return "60-69";
  if (age < 80) return "70-79";
  return "80+";
}
