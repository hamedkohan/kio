export type DemoWorkspace =
  | "operations"
  | "radiologist_review"
  | "physician_review"
  | "patient_portal"
  | "guest_review"
  | "research"
  | "admin";

export type DemoUserRole =
  | "operations_coordinator"
  | "radiologist"
  | "mri_scientist_ai_qa"
  | "neurologist_physician"
  | "referring_physician"
  | "patient"
  | "caregiver"
  | "psychologist_guest_reviewer"
  | "researcher"
  | "data_steward_research_admin"
  | "organization_admin";

export type DemoSex = "F" | "M" | "Other" | "Unknown";

export type DemoReportType =
  | "visual_mri_dementia_protocol"
  | "ai_volumetry_single"
  | "ai_volumetry_longitudinal"
  | "ai_corticometry_longitudinal"
  | string;

export type DemoVisibility = "clinical_only" | "patient_safe" | "research_deidentified" | string;

export type DemoUser = {
  user_id: string;
  name: string;
  email: string;
  role: DemoUserRole;
  workspace: DemoWorkspace;
  locale?: string;
  linked_patient_id?: string | null;
  can_login: boolean;
};

export type DemoPatient = {
  patient_id: string;
  source_patient_id?: string;
  name: string;
  name_fa?: string | null;
  age_at_study: number;
  sex: DemoSex;
  default_language?: string;
  visibility_status?: string;
};

export type DemoCase = {
  case_id: string;
  patient_id: string;
  accession_number?: string;
  case_title: string;
  primary_module: string;
  modality: string;
  protocol?: string;
  mri_field_strength?: string | null;
  study_date: string;
  case_state: string;
  ai_processing_status: string;
  qc_state: string;
  report_state: string;
  publication_state: string;
  current_owner_user_id?: string;
  risk_level?: "informational" | "moderate" | "high_attention" | "qc_attention" | string;
  source_type?: string;
};

export type DemoReport = {
  report_id: string;
  case_id: string;
  report_type: DemoReportType;
  title: string;
  module: string;
  source_pdf?: string;
  report_date: string;
  version?: string;
  status: string;
  clinical_summary?: string;
};

export type DemoReportModule = {
  module_id: string;
  display_name: string;
  data_domains: string[];
  product_promise?: string;
  patient_visibility: string;
};

export type DemoQuantitativeMetric = {
  metric_id: string;
  report_id: string;
  case_id: string;
  patient_id: string;
  domain: "visual_mri" | "volumetry" | "corticometry" | string;
  module: string;
  study_date: string;
  comparison_study_date?: string | null;
  structure: string;
  hemisphere: "left" | "right" | "total" | "global" | "midline" | string;
  measure: "volume" | "diameter" | "index" | "cortical_thickness" | string;
  unit: "cm3" | "mm" | "index" | string;
  value: number;
  percent_icv?: number | null;
  percentile?: number | null;
  previous_value?: number | null;
  previous_percent_icv?: number | null;
  previous_percentile?: number | null;
  change_percent?: number | null;
  is_outlier: boolean;
  source_page?: number;
  source_pdf?: string;
};

export type DemoVisualScore = {
  score_id: string;
  case_id: string;
  report_id: string;
  name: string;
  short_name: string;
  value: number;
  side: string;
  scale?: string;
  normal_for_age?: string | null;
  interpretation?: string;
  source_page?: number;
};

export type DemoFinding = {
  finding_id: string;
  case_id: string;
  report_id: string;
  category: string;
  finding: string;
  severity: string;
  visibility: DemoVisibility;
};

export type DemoTask = {
  task_id: string;
  case_id: string;
  title: string;
  assigned_role: DemoUserRole;
  status: string;
  priority?: string;
};

export type DemoAuditEvent = {
  event_id: string;
  case_id: string;
  actor_user_id: string;
  event_type: string;
  event_summary?: string;
  created_at?: string;
  timestamp?: string;
  details?: string;
};

export type DemoAsset = {
  asset_id: string;
  type: "source_page_render" | string;
  module: string;
  source_pdf: string;
  page_number: number;
  path: string;
};

export type DemoSeed = {
  metadata: Record<string, unknown>;
  users: DemoUser[];
  patients: DemoPatient[];
  cases: DemoCase[];
  reports: DemoReport[];
  report_modules: DemoReportModule[];
  visual_scores: DemoVisualScore[];
  quantitative_metrics: DemoQuantitativeMetric[];
  findings: DemoFinding[];
  tasks: DemoTask[];
  audit_events: DemoAuditEvent[];
};

export type DemoCaseSummary = {
  caseRecord: DemoCase;
  patient: DemoPatient;
  reports: DemoReport[];
  modules: DemoReportModule[];
  owner?: DemoUser;
  metricCount: number;
  outlierCount: number;
  visualScoreCount: number;
  longitudinal: boolean;
  lastUpdated: string;
};

export type DemoCaseDetail = DemoCaseSummary & {
  metrics: DemoQuantitativeMetric[];
  outlierMetrics: DemoQuantitativeMetric[];
  visualScores: DemoVisualScore[];
  findings: DemoFinding[];
  tasks: DemoTask[];
  auditEvents: DemoAuditEvent[];
  sourceAssets: DemoAsset[];
};

export type DemoRoleVisibility = {
  role: DemoUserRole;
  caseSummary: DemoCaseSummary;
  canSeePatientIdentity: boolean;
  canSeeClinicalFindings: boolean;
  canSeeRawMetrics: boolean;
  canSeeVisualScores: boolean;
  canSeeSourcePages: boolean;
  patientSafeOnly: boolean;
};
