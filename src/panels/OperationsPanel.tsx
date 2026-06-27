import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import type { CreateCaseFormValues } from "../types";
import { ActionCluster, CaseBlockerList, CaseWorkflowSummary, EmptyState, EvidenceSection, PageHeader, PanelCard, ReportReadinessChecklist, StatusChip, Timeline, WorkflowReadinessPanel, WorkspaceHero } from "../components/ui";
import { DemoReportWorkspace } from "../components/DemoReportWorkspace";
import { CaseJourney } from "../components/CaseJourney";
import type { OperationsCaseCoordinationView } from "../domain";

type Props = {
  caseViews: OperationsCaseCoordinationView[];
  activeView: string;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onAction: (action: string, caseId?: string) => void;
  onCreateCase: (values: CreateCaseFormValues) => void;
};

export const operationsNav = [
  { id: "dashboard", label: "Operations Overview" },
  { id: "queue", label: "Case List" },
  { id: "mri", label: "MRI Intake" },
  { id: "issues", label: "Blockers & Actions" },
  { id: "reports", label: "Reports & Release" },
  { id: "followups", label: "Follow-up Coordination" },
];

const defaultCreateCaseValues: CreateCaseFormValues = {
  patientName: "",
  age: 68,
  sex: "Female",
  referralSource: "Memory clinic",
  assignedRadiologist: "Dr. N. Azadi",
  assignedNeurologist: "Dr. P. Sadeghi",
  mriSource: "Not available yet",
  intakeStatus: "Not requested",
  consentStatus: "Not requested",
  caregiverName: "",
  caregiverContact: "",
  priorImagingAvailable: "Unknown",
  operationsNote: "",
};

export function OperationsPanel({ caseViews, activeView, selectedCaseId, onSelectCase, onAction, onCreateCase }: Props) {
  const { t, tv, formatNumber } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"details" | "timeline">("details");
  const [dashboardFilter, setDashboardFilter] = useState<"all" | "attention" | "radiologist" | "reports">("attention");
  const [caseFilters, setCaseFilters] = useState({
    search: "",
    status: "All",
    owner: "All",
    blocker: "All",
    sex: "All",
    ageBand: "All",
  });
  const selected = caseViews.find((item) => item.id === selectedCaseId) ?? caseViews[0];
  const attention = caseViews.filter((item) => item.operationalBlockers.length || /created|pending|waiting|issue/i.test(item.caseStatus));
  const reports = caseViews.filter((item) => /released|final/i.test(item.reportOperationalStatus));
  const followups = caseViews.filter((item) => /^scheduled/i.test(item.followUpStatus));
  const radiologistQueue = caseViews.filter((item) => /pending|needs/i.test(item.radiologistRoutingStatus));
  const filteredCases = caseViews.filter((item) => {
    const search = caseFilters.search.trim().toLowerCase();
    const haystack = [item.caseCode, item.patientDisplayName, tv(item.patientDisplayName), item.caseStatus, tv(item.caseStatus), item.currentOwner, tv(item.currentOwner)]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = caseFilters.status === "All" || item.caseStatus === caseFilters.status;
    const matchesOwner = caseFilters.owner === "All" || item.currentOwner === caseFilters.owner;
    const matchesBlocker = caseFilters.blocker === "All" || (caseFilters.blocker === "Has blocker" ? item.operationalBlockers.length > 0 : item.operationalBlockers.length === 0);
    const matchesSex = caseFilters.sex === "All" || item.sex === caseFilters.sex;
    const matchesAge = caseFilters.ageBand === "All" || (caseFilters.ageBand === "Under 70" ? item.age < 70 : item.age >= 70);
    return matchesSearch && matchesStatus && matchesOwner && matchesBlocker && matchesSex && matchesAge;
  });
  const dashboardItemsByFilter = {
    all: caseViews,
    attention,
    radiologist: radiologistQueue,
    reports,
  };
  const dashboardItems = dashboardItemsByFilter[dashboardFilter];
  const dashboardFilterTitles = {
    all: "All active cases",
    attention: "Action-needed cases",
    radiologist: "Radiologist review cases",
    reports: "Released report cases",
  };
  const activateDashboardFilter = (filter: typeof dashboardFilter) => {
    setDashboardFilter(filter);
  };
  const openCaseDrawer = (caseId: string, tab: "details" | "timeline" = "details") => {
    onSelectCase(caseId);
    setDrawerTab(tab);
    setDetailDrawerOpen(true);
  };
  const detailDrawer = detailDrawerOpen ? (
    <OperationsCaseDrawer item={selected} activeTab={drawerTab} onTabChange={setDrawerTab} onClose={() => setDetailDrawerOpen(false)} onAction={onAction} />
  ) : null;

  const caseTable = (items: OperationsCaseCoordinationView[]) => (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t("Case")}</th><th>{t("Current status")}</th><th>{t("Missing / blocker")}</th><th>{t("Owner")}</th><th>{t("Next action")}</th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={detailDrawerOpen && item.id === selected.id ? "selected-row" : ""} onClick={() => openCaseDrawer(item.id)}>
              <td><OperationsCaseIdentity item={item} /></td>
              <td><StatusChip label={item.caseStatus} /></td>
              <td>{item.operationalBlockers.length ? tv(item.operationalBlockers[0]) : t("None")}</td>
              <td>{tv(item.currentOwner)}</td>
              <td><button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); openCaseDrawer(item.id); }}>{t("Open case")}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (activeView === "queue") return (
    <>
      <PageHeader eyebrow="Operational control" title="Case List" description="All active cases with current owner, blocker, and next action." action={<button className="primary-button" onClick={() => setCreateOpen(true)}>{t("Create Case")}</button>} />
      <PanelCard title="Active cases" subtitle={`${formatNumber(filteredCases.length)} ${t("of")} ${formatNumber(caseViews.length)} ${t("cases shown")}`}>
        <OperationsCaseFilters filters={caseFilters} onChange={setCaseFilters} cases={caseViews} />
        {filteredCases.length ? caseTable(filteredCases) : <EmptyState title="No cases match these filters" message="Clear or adjust filters to see operational cases again." />}
      </PanelCard>
      {detailDrawer}
      {createOpen ? <CreateCaseModal onClose={() => setCreateOpen(false)} onCreate={(values) => { onCreateCase(values); setCreateOpen(false); }} /> : null}
    </>
  );

  if (activeView === "mri") {
    const mriItems = caseViews.filter((item) => item.mriStatus !== "Received");
    return (
      <>
        <PageHeader eyebrow="MRI intake" title="MRI Intake" description="Resolve missing, unmatched, or quality-flagged MRI studies before specialist review." />
        {mriItems.length ? <PanelCard title="MRI attention queue">{caseTable(mriItems)}</PanelCard> : <EmptyState title="No MRI items need attention" message="All current studies are received and ready." />}
        {detailDrawer}
      </>
    );
  }

  if (activeView === "issues") return (
    <>
      <PageHeader eyebrow="Operational attention" title="Blockers & Actions" description="Non-clinical blockers and workflow exceptions that require coordination." />
      <div className="card-grid two">
        {attention.map((item) => (
          <PanelCard key={item.id} title={item.id} subtitle={tv(item.patientDisplayName)} action={<StatusChip label={item.caseStatus} />}>
            <div className="alert-block"><strong>{tv(item.operationalBlockers[0] ?? item.nextAction)}</strong><p>{t("Next action")}: {tv(item.nextAction)}</p></div>
            <button className="secondary-button" type="button" onClick={() => openCaseDrawer(item.id)}>{t("Open operational detail")}</button>
          </PanelCard>
        ))}
      </div>
      {detailDrawer}
    </>
  );

  if (activeView === "reports") return (
    <>
      <PageHeader eyebrow="Release administration" title="Reports & Release" description="Only finalized, approved, or released output status is visible here; clinical interpretation remains hidden." />
      {reports.length ? <PanelCard title="Approved output">{caseTable(reports)}</PanelCard> : <EmptyState title="No reports ready" message="Approved reports will appear after clinical finalization and release approval." />}
      {detailDrawer}
    </>
  );

  if (activeView === "followups") return (
    <>
      <PageHeader eyebrow="Coordination" title="Follow-up Coordination" description="Coordinate physician-defined review points without presenting treatment recommendations." />
      <div className="followup-overview">
        <PanelCard title="Follow-up coordination queue" subtitle="Only physician-defined review points that need operational coordination">
          {followups.length ? (
            <div className="followup-list">
              {followups.map((item) => (
                <button key={item.id} type="button" className={`followup-row ${item.id === selected.id ? "active" : ""}`} onClick={() => onSelectCase(item.id)}>
                  <OperationsCaseIdentity item={item} />
                  <div className="followup-row-status">
                    <span>{t("Coordination state")}</span>
                    <StatusChip label={item.followUpStatus} />
                  </div>
                  <div className="followup-row-action">
                    <span>{t("Next operational step")}</span>
                    <strong>{tv(item.nextAction)}</strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No follow-up coordination needed" message="No physician-defined follow-up review points require Operations action right now." />
          )}
        </PanelCard>
        <PanelCard title="No follow-up action" subtitle={`${formatNumber(caseViews.length - followups.length)} ${t("cases")}`}>
          <div className="quiet-summary">
            <StatusChip label="No action needed" />
            <p>{t("Cases without a physician-defined follow-up point are kept out of the coordination queue to reduce operational noise.")}</p>
          </div>
        </PanelCard>
      </div>
      <PanelCard title="Follow-up coordination placeholder" subtitle="Prototype scope: status tracking, not scheduling software">
        <div className="status-list"><div><span>{t("Coordination owner")}</span><StatusChip label="Operations" /></div><div><span>{t("Scheduling editor")}</span><StatusChip label="Not active" /></div><div><span>{t("Treatment guidance")}</span><StatusChip label="Out of scope" /></div></div>
        <div className="safe-note"><strong>{t("Boundary")}</strong><p>{t("Follow-up remains a physician-defined review point coordinated by Operations. The prototype does not recommend treatment or manage hospital-wide scheduling.")}</p></div>
      </PanelCard>
      {detailDrawer}
    </>
  );

  return (
    <>
      <WorkspaceHero
        eyebrow="Operations Command Center"
        title="Coordinate case flow without clinical overexposure"
        description="Track intake, consent, MRI readiness, owners, blockers, and release administration from a single operational workspace."
        stats={[
          { label: "Active cases", value: caseViews.length, detail: "Across intake, review, and follow-up", tone: "info" },
          { label: "Need attention", value: attention.length, detail: "Missing items or workflow blockers", tone: "attention" },
          { label: "Radiologist review", value: radiologistQueue.length, detail: "Ready or waiting for imaging review" },
          { label: "Reports released", value: reports.length, detail: "Approved patient-facing output", tone: "good" },
        ]}
        action={<button className="primary-button" onClick={() => setCreateOpen(true)}>{t("Create Case")}</button>}
      />
      <PanelCard
        title="Case journey"
        subtitle="Canonical end-to-end lifecycle for the selected case"
        action={
          <div className="button-row">
            <button className="secondary-button" onClick={() => onAction("reset-demo", selected.id)}>{t("Reset")}</button>
            <button className="primary-button" onClick={() => onAction("advance-demo", selected.id)}>{t("Advance demo case →")}</button>
          </div>
        }
      >
        <CaseJourney caseRecord={selected} consentStatus={selected.consentStatus} />
      </PanelCard>
      <OperationsReportPipeline item={selected} />
      <DemoReportWorkspace role="operations" title="Structured legacy-report demo cases" />
      <PanelCard
        title={dashboardFilterTitles[dashboardFilter]}
        subtitle="Operational worklist filtered by coordination need"
        action={<DashboardFilterBar active={dashboardFilter} counts={{ all: caseViews.length, attention: attention.length, radiologist: radiologistQueue.length, reports: reports.length }} onChange={activateDashboardFilter} />}
      >
        {dashboardItems.length ? caseTable(dashboardItems) : <EmptyState title="No cases in this filter" message="Choose another operational filter to continue reviewing cases." />}
      </PanelCard>
      {detailDrawer}
      {createOpen ? <CreateCaseModal onClose={() => setCreateOpen(false)} onCreate={(values) => { onCreateCase(values); setCreateOpen(false); }} /> : null}
    </>
  );
}

function DashboardFilterBar({
  active,
  counts,
  onChange,
}: {
  active: "all" | "attention" | "radiologist" | "reports";
  counts: Record<"all" | "attention" | "radiologist" | "reports", number>;
  onChange: (filter: "all" | "attention" | "radiologist" | "reports") => void;
}) {
  const { t, formatNumber } = useI18n();
  const items: Array<{ id: "all" | "attention" | "radiologist" | "reports"; label: string }> = [
    { id: "attention", label: "Need attention" },
    { id: "radiologist", label: "Radiologist review" },
    { id: "reports", label: "Reports released" },
    { id: "all", label: "All cases" },
  ];
  return (
    <div className="dashboard-filter-bar">
      {items.map((item) => (
        <button key={item.id} type="button" className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
          {t(item.label)} <span>{formatNumber(counts[item.id])}</span>
        </button>
      ))}
    </div>
  );
}

function OperationsReportPipeline({ item }: { item: OperationsCaseCoordinationView }) {
  const { t, tv } = useI18n();
  return (
    <EvidenceSection
      eyebrow="Operational report pipeline"
      title="From imaging intake to patient-safe release"
      description="Operations sees readiness and routing only; clinical evidence, report internals, and synthesis content stay hidden."
    >
      <div className="pipeline-strip">
        {[
          { label: "MRI intake", value: item.mriStatus, detail: item.mriSource ?? "Source pending" },
          { label: "AI processing", value: item.aiProcessingOperationalStatus, detail: "Technical status only" },
          { label: "Radiologist review", value: item.radiologistRoutingStatus, detail: "Owner routing" },
          { label: "Physician synthesis", value: item.physicianRoutingStatus, detail: "Clinical owner" },
          { label: "Patient-safe summary", value: item.reportOperationalStatus, detail: "Content hidden" },
          { label: "Publication approval", value: item.patientPortalOperationalStatus, detail: "Release gate" },
          { label: "Patient portal", value: item.followUpStatus, detail: "Follow-up coordination" },
        ].map((step) => (
          <div className="pipeline-step" key={step.label}>
            <span>{t(step.label)}</span>
            <strong>{tv(step.value)}</strong>
            <small>{t(step.detail)}</small>
          </div>
        ))}
      </div>
      <ReportReadinessChecklist title="Selected case operational readiness" items={[
        { label: "Current owner", status: item.currentOwner, detail: "Who should act next" },
        { label: "Operational blocker", status: item.operationalBlockers.length ? "Blocked" : "Clear", detail: item.operationalBlockers[0] ?? "No operational blocker" },
        { label: "Next operational action", status: item.nextAction, detail: "Derived from workflow state" },
        { label: "Patient release coordination", status: item.patientPortalOperationalStatus, detail: "Clinical content hidden from Operations" },
      ]} />
    </EvidenceSection>
  );
}

function OperationsCaseIdentity({ item }: { item: OperationsCaseCoordinationView }) {
  const { tv, formatNumber } = useI18n();
  const isFemale = item.sex === "Female";
  return (
    <div className="case-identity">
      <span className={`avatar gender-avatar ${isFemale ? "avatar-female" : "avatar-male"}`} role="img" aria-label={tv(item.sex)}>
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle className="avatar-head" cx="16" cy="11.5" r="5.2" />
          {isFemale ? <path className="avatar-hair" d="M9.4 14.3c.4-6.2 3-9.2 6.6-9.2s6.2 3 6.6 9.2c-1.1 1-2.3 1.6-3.8 1.9.6-1 .9-2.1.9-3.3 0-2.7-1.5-4.8-3.7-4.8s-3.7 2.1-3.7 4.8c0 1.2.3 2.3.9 3.3-1.5-.3-2.8-.9-3.8-1.9Z" /> : null}
          <path className="avatar-shoulders" d="M7.6 26.2c.8-5.1 4-8.1 8.4-8.1s7.6 3 8.4 8.1" />
          {isFemale ? <path className="avatar-detail" d="M12 22.4c1.1.7 2.5 1.1 4 1.1s2.9-.4 4-1.1" /> : <path className="avatar-detail" d="M12.2 7.4c1.2-.9 2.5-1.3 3.8-1.3s2.6.4 3.8 1.3" />}
        </svg>
      </span>
      <div>
        <strong>{tv(item.patientDisplayName)}</strong>
        <p><span dir="ltr">{item.caseCode}</span> · {formatNumber(item.age)} {tv("years")} · {tv(item.sex)}</p>
      </div>
    </div>
  );
}

type OperationsFilters = {
  search: string;
  status: string;
  owner: string;
  blocker: string;
  sex: string;
  ageBand: string;
};

function OperationsCaseFilters({ filters, onChange, cases }: { filters: OperationsFilters; onChange: (filters: OperationsFilters) => void; cases: OperationsCaseCoordinationView[] }) {
  const { t, tv } = useI18n();
  const statuses = Array.from(new Set(cases.map((item) => item.caseStatus)));
  const owners = Array.from(new Set(cases.map((item) => item.currentOwner)));
  const update = (key: keyof OperationsFilters, value: string) => onChange({ ...filters, [key]: value });
  const reset = () => onChange({ search: "", status: "All", owner: "All", blocker: "All", sex: "All", ageBand: "All" });

  return (
    <div className="operations-filter-panel">
      <div className="filter-panel-header">
        <div>
          <strong>{t("Case filters")}</strong>
          <span>{t("Filter by name, status, owner, blocker, sex, or age band")}</span>
        </div>
        <button className="text-button" type="button" onClick={reset}>{t("Clear filters")}</button>
      </div>
      <div className="operations-filter-grid">
        <label>{t("Search case or name")}<input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder={t("Name, case ID, or status")} /></label>
        <label>{t("Current status")}<select value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="All">{t("All statuses")}</option>{statuses.map((status) => <option key={status} value={status}>{tv(status)}</option>)}</select></label>
        <label>{t("Owner")}<select value={filters.owner} onChange={(event) => update("owner", event.target.value)}><option value="All">{t("All owners")}</option>{owners.map((owner) => <option key={owner} value={owner}>{tv(owner)}</option>)}</select></label>
        <label>{t("Blocker")}<select value={filters.blocker} onChange={(event) => update("blocker", event.target.value)}><option value="All">{t("All")}</option><option value="Has blocker">{t("Has blocker")}</option><option value="No blocker">{t("No blocker")}</option></select></label>
        <label>{t("Sex")}<select value={filters.sex} onChange={(event) => update("sex", event.target.value)}><option value="All">{t("All")}</option><option value="Female">{t("Female")}</option><option value="Male">{t("Male")}</option></select></label>
        <label>{t("Age band")}<select value={filters.ageBand} onChange={(event) => update("ageBand", event.target.value)}><option value="All">{t("All")}</option><option value="Under 70">{t("Under 70")}</option><option value="70 and above">{t("70 and above")}</option></select></label>
      </div>
    </div>
  );
}

function OperationalSummary({ item, onAction }: { item: OperationsCaseCoordinationView; onAction: Props["onAction"] }) {
  const { t, tv } = useI18n();
  const visibleActionIds = new Set(["receive-mri", "request-intake", "request-consent", "request-mri", "start-mri-intake", "complete-mri-intake", "assign-rad", "publish", "schedule-followup", "close-case"]);
  const availableActions = item.allowedActions.filter((action) => action.allowed && visibleActionIds.has(action.uiAction));
  return (
    <div className="operational-summary">
      <CaseWorkflowSummary stateLabel={item.caseStatus} owner={item.currentOwner} nextAction={item.nextAction} patientVisibility={item.patientPortalOperationalStatus} readiness={item.priority === "blocked" ? "Blocked" : item.priority === "attention" ? "Needs attention" : "Ready"} />
      <CaseBlockerList blockers={item.operationalBlockers} empty="No operational blocker is currently recorded for this case." />
      <div className="next-action hero">
        <span>{t("Primary operational focus")}</span>
        <strong>{tv(item.nextAction)}</strong>
        <p>{item.operationalBlockers.length ? tv(item.operationalBlockers[0]) : t("No blocker is currently recorded for this case.")}</p>
      </div>
      <WorkflowReadinessPanel items={[
        { label: "Intake", status: item.intakeStatus },
        { label: "Consent", status: item.consentStatus },
        { label: "MRI", status: item.mriStatus, detail: item.mriSource ?? "Not recorded" },
        { label: "Image quality", status: item.imageQualityOperationalStatus },
        { label: "AI processing", status: item.aiProcessingOperationalStatus },
        { label: "Radiologist routing", status: item.radiologistRoutingStatus },
        { label: "Physician routing", status: item.physicianRoutingStatus },
        { label: "Release administration", status: item.patientPortalOperationalStatus },
      ]} />
      <ActionCluster title="Available operational actions" description="Actions shown here are limited to Operations-owned coordination tasks.">
        {availableActions.length ? (
          <>
            {availableActions.map((action) => (
              <button key={action.uiAction} className={action.primary ? "primary-button" : "secondary-button"} onClick={() => onAction(action.uiAction, item.id)}>{t(action.label)}</button>
            ))}
          </>
        ) : (
          <div className="quiet-summary compact"><StatusChip label="No action needed" /><p>{t("No Operations-owned action is available from this state.")}</p></div>
        )}
      </ActionCluster>
      {item.mriStatus === "Missing" ? <div className="prototype-note"><strong>{t("Demo coordination shortcut")}</strong><p>{t("For this frontend demo, this action advances operational routing so the Radiologist handoff can be inspected without backend automation.")}</p></div> : null}
      {item.operationsNote ? <div className="prototype-note"><strong>{t("Operations-only note")}</strong><p>{tv(item.operationsNote)}</p></div> : null}
    </div>
  );
}

function OperationalDetail({ item, onAction }: { item: OperationsCaseCoordinationView; onAction: Props["onAction"] }) {
  return (
    <>
      <div className="split-layout">
        <PanelCard title={`${item.id} case detail`} subtitle="Operational control view"><OperationalSummary item={item} onAction={onAction} /></PanelCard>
        <PanelCard title="Timeline"><Timeline events={item.operationalTimeline} /></PanelCard>
      </div>
    </>
  );
}

function OperationsCaseDrawer({
  item,
  activeTab,
  onTabChange,
  onClose,
  onAction,
}: {
  item: OperationsCaseCoordinationView;
  activeTab: "details" | "timeline";
  onTabChange: (tab: "details" | "timeline") => void;
  onClose: () => void;
  onAction: Props["onAction"];
}) {
  const { t, tv } = useI18n();
  return (
    <div className="detail-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={t("Operational case drawer")} onClick={(event) => event.stopPropagation()}>
        <div className="detail-drawer-header">
          <div>
            <p className="eyebrow">{t("Operational case drawer")}</p>
            <OperationsCaseIdentity item={item} />
          </div>
          <button className="icon-close" type="button" onClick={onClose} aria-label={t("Close case detail")}>×</button>
        </div>
        <div className="drawer-status-strip">
          <div><span>{t("Status")}</span><StatusChip label={item.caseStatus} /></div>
          <div><span>{t("Owner")}</span><strong>{tv(item.currentOwner)}</strong></div>
          <div><span>{t("Next action")}</span><strong>{tv(item.nextAction)}</strong></div>
        </div>
        <div className="drawer-tabs" role="tablist" aria-label={t("Case detail tabs")}>
          <button type="button" className={activeTab === "details" ? "active" : ""} onClick={() => onTabChange("details")}><span>{t("Operational details")}</span><small>{t("Status, owner, blockers")}</small></button>
          <button type="button" className={activeTab === "timeline" ? "active" : ""} onClick={() => onTabChange("timeline")}><span>{t("Approval and coordination timeline")}</span><small>{t("Status history and handoffs")}</small></button>
        </div>
        <div className="detail-drawer-body">
          {activeTab === "details" ? (
            <OperationalSummary item={item} onAction={onAction} />
          ) : (
            <PanelCard title="Approval and coordination timeline" subtitle="Operational history with Iranian-calendar dates in Persian mode">
              <Timeline events={item.operationalTimeline} />
            </PanelCard>
          )}
        </div>
      </aside>
    </div>
  );
}

function CreateCaseModal({ onClose, onCreate }: { onClose: () => void; onCreate: (values: CreateCaseFormValues) => void }) {
  const { t } = useI18n();
  const [values, setValues] = useState<CreateCaseFormValues>(defaultCreateCaseValues);
  const canSubmit = values.patientName.trim().length > 0 && values.age > 0 && values.referralSource.trim().length > 0;

  const update = <Key extends keyof CreateCaseFormValues>(key: Key, value: CreateCaseFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onCreate({ ...values, patientName: values.patientName.trim(), referralSource: values.referralSource.trim() });
    setValues(defaultCreateCaseValues);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel create-case-modal" role="dialog" aria-modal="true" aria-labelledby="create-case-title">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div>
              <p className="eyebrow">{t("Operations prototype flow")}</p>
              <h2 id="create-case-title">{t("Create Case Shell")}</h2>
              <p>{t("This creates an operational shell only. It is not full patient registration, consent signing, PACS search, billing, or EMR sync.")}</p>
            </div>
            <button className="icon-close" type="button" onClick={onClose} aria-label={t("Close create case")}>×</button>
          </div>

          <div className="modal-section">
            <h3>{t("Required shell fields")}</h3>
            <div className="form-grid create-case-grid">
              <label>{t("Patient name or initials")}<input value={values.patientName} onChange={(event) => update("patientName", event.target.value)} placeholder={t("e.g. N. Karimi")} required /></label>
              <label>{t("Age")}<input type="number" min={1} max={120} value={values.age} onChange={(event) => update("age", Number(event.target.value))} required /></label>
              <label>{t("Sex")}<select value={values.sex} onChange={(event) => update("sex", event.target.value as CreateCaseFormValues["sex"])}><option value="Female">{t("Female")}</option><option value="Male">{t("Male")}</option></select></label>
              <label>{t("Referral source")}<input value={values.referralSource} onChange={(event) => update("referralSource", event.target.value)} placeholder={t("Memory clinic")} required /></label>
              <label>{t("Assigned radiologist")}<select value={values.assignedRadiologist} onChange={(event) => update("assignedRadiologist", event.target.value)}><option value="Dr. N. Azadi">Dr. N. Azadi</option><option value="Dr. M. Farzan">Dr. M. Farzan</option><option value="Unassigned">{t("Unassigned")}</option></select></label>
              <label>{t("Assigned neurologist")}<select value={values.assignedNeurologist} onChange={(event) => update("assignedNeurologist", event.target.value)}><option value="Dr. P. Sadeghi">Dr. P. Sadeghi</option><option value="Dr. L. Vaziri">Dr. L. Vaziri</option><option value="Unassigned">{t("Unassigned")}</option></select></label>
              <label>{t("MRI source")}<select value={values.mriSource} onChange={(event) => update("mriSource", event.target.value as CreateCaseFormValues["mriSource"])}><option value="PACS">{t("PACS")}</option><option value="Patient upload link">{t("Patient upload link")}</option><option value="Not available yet">{t("Not available yet")}</option></select></label>
              <label>{t("Intake status")}<select value={values.intakeStatus} onChange={(event) => update("intakeStatus", event.target.value as CreateCaseFormValues["intakeStatus"])}><option value="Not requested">{t("Not requested")}</option><option value="Requested">{t("Requested")}</option><option value="Completed">{t("Completed")}</option></select></label>
              <label>{t("Consent status")}<select value={values.consentStatus} onChange={(event) => update("consentStatus", event.target.value as CreateCaseFormValues["consentStatus"])}><option value="Not requested">{t("Not requested")}</option><option value="Requested">{t("Requested")}</option><option value="Completed">{t("Completed")}</option></select></label>
            </div>
          </div>

          <div className="modal-section">
            <h3>{t("Optional operational context")}</h3>
            <div className="form-grid create-case-grid">
              <label>{t("Caregiver name")}<input value={values.caregiverName} onChange={(event) => update("caregiverName", event.target.value)} placeholder={t("Prototype optional")} /></label>
              <label>{t("Caregiver contact placeholder")}<input value={values.caregiverContact} onChange={(event) => update("caregiverContact", event.target.value)} placeholder={t("Not a real contact system")} /></label>
              <label>{t("Prior imaging available")}<select value={values.priorImagingAvailable} onChange={(event) => update("priorImagingAvailable", event.target.value as CreateCaseFormValues["priorImagingAvailable"])}><option value="Unknown">{t("Unknown")}</option><option value="Yes">{t("Yes")}</option><option value="No">{t("No")}</option></select></label>
              <label className="full-width">{t("Notes for Operations only")}<textarea value={values.operationsNote} onChange={(event) => update("operationsNote", event.target.value)} placeholder={t("Operational note only. Do not add clinical interpretation.")} /></label>
            </div>
          </div>

          <div className="safe-note">
            <strong>{t("Scope boundary")}</strong>
            <p>{t("This shell does not create AI findings, diagnosis wording, clinical interpretation, patient registration, real consent signing, PACS search, duplicate matching, insurance, billing, or EMR/EHR sync.")}</p>
          </div>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>{t("Cancel")}</button>
            <button className="primary-button" type="submit" disabled={!canSubmit}>{t("Create shell")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
