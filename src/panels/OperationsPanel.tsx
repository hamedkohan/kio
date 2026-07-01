import { useMemo, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import type { CreateCaseFormValues } from "../types";
import { ActionCluster, CaseBlockerList, CaseWorkflowSummary, EmptyState, GenderAvatar, PageHeader, PanelCard, StatusChip, Timeline, WorkflowReadinessPanel } from "../components/ui";
import { CaseJourney, PHASE_LABELS, PHASE_ORDER } from "../components/CaseJourney";
import { CASE_STATE_DEFINITIONS, type CasePhase, type CaseState } from "../domain/caseState";
import { Integrations } from "../components/Integrations";
import { makeDirectoryId, type ClinicianRole, type Directory, type DirectoryClinician, type ImagingCenter } from "../data/directory";
import type { OperationsCaseCoordinationView } from "../domain";

type DashboardFilter = "all" | "attention" | "blocked" | "radiologist" | "reports";

const PRIORITY_RANK: Record<OperationsCaseCoordinationView["priority"], number> = { blocked: 0, attention: 1, routine: 2 };

// Operational cases whose processed MRI has a bundled imaging-analysis contract the
// AI registry can run over. Maps the operational case id → its analysis dataset id.
// Only datasets with real Desikan-Killiany region data are mapped (case-002: 31
// regions, case-003: 31 regions + longitudinal), so every run is meaningful.
const RUNTIME_ANALYSIS_BY_CASE: Record<string, string> = {
  "K-2041": "case-002",
  "K-2043": "case-003",
};

// Operations-owned actions that can be triggered directly from a worklist row.
const QUICK_ACTION_IDS = new Set(["receive-mri", "request-intake", "request-consent", "request-mri", "start-mri-intake", "complete-mri-intake", "assign-rad", "publish", "schedule-followup", "close-case"]);

function quickActionFor(item: OperationsCaseCoordinationView) {
  // Surface a one-click action only when the case's canonical next step (the
  // state's primary allowed action) is an Operations-owned action. Otherwise the
  // case is progressing under another role (radiologist, physician, AI/system,
  // research) and Operations only observes — so no action button is shown.
  const primaryDomainAction = CASE_STATE_DEFINITIONS[item.state as CaseState]?.allowedActions[0];
  if (!primaryDomainAction) return null;
  return (
    item.allowedActions.find(
      (action) => action.allowed && action.domainAction === primaryDomainAction && QUICK_ACTION_IDS.has(action.uiAction),
    ) ?? null
  );
}

type Props = {
  caseViews: OperationsCaseCoordinationView[];
  activeView: string;
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
  onAction: (action: string, caseId?: string) => void;
  onCreateCase: (values: CreateCaseFormValues) => void;
  directory: Directory;
  onSaveClinician: (clinician: DirectoryClinician) => void;
  onSaveCenter: (center: ImagingCenter) => void;
};

export const operationsNav = [
  { id: "dashboard", label: "Operations Overview" },
  { id: "queue", label: "Case List" },
  { id: "mri", label: "MRI Intake" },
  { id: "issues", label: "Action Center" },
  { id: "reports", label: "Report Release" },
  { id: "followups", label: "Follow-up Coordination" },
  { id: "directory", label: "Directory" },
  { id: "integrations", label: "Integrations & AI" },
];

const defaultCreateCaseValues: CreateCaseFormValues = {
  patientName: "",
  age: 0,
  sex: "Female",
  referralSource: "",
  assignedRadiologist: "Unassigned",
  assignedNeurologist: "Unassigned",
  mriSource: "Not available yet",
  // A new case starts with nothing requested yet; the workflow tracks these.
  intakeStatus: "Not requested",
  consentStatus: "Not requested",
  caregiverName: "",
  caregiverContact: "",
  priorImagingAvailable: "Unknown",
  operationsNote: "",
  imagingCenter: "",
};

export function OperationsPanel({ caseViews, activeView, selectedCaseId, onSelectCase, onAction, onCreateCase, directory, onSaveClinician, onSaveCenter }: Props) {
  const { t, tv, formatNumber } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>("attention");
  const [mriFilter, setMriFilter] = useState<"all" | "quality" | "matching" | "awaiting" | "notReady">("all");
  const [actionFilter, setActionFilter] = useState<"all" | "ready" | "waiting">("all");
  const [releaseFilter, setReleaseFilter] = useState<"all" | "ready" | "hold" | "released" | "awaiting">("all");
  const [followUpFilter, setFollowUpFilter] = useState<"all" | "Pending" | "Scheduled" | "Reminder sent" | "Done">("all");
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
  const blocked = caseViews.filter((item) => item.priority === "blocked");
  const reports = caseViews.filter((item) => /released|final/i.test(item.reportOperationalStatus));
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
  const dashboardItemsByFilter: Record<DashboardFilter, OperationsCaseCoordinationView[]> = {
    all: caseViews,
    attention,
    blocked,
    radiologist: radiologistQueue,
    reports,
  };
  const dashboardItems = [...dashboardItemsByFilter[dashboardFilter]].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.caseCode.localeCompare(b.caseCode),
  );
  const dashboardFilterTitles: Record<DashboardFilter, string> = {
    all: "All active cases",
    attention: "Cases needing attention",
    blocked: "Blocked cases",
    radiologist: "Cases in radiologist review",
    reports: "Released report cases",
  };
  const activateDashboardFilter = (filter: DashboardFilter) => {
    setDashboardFilter(filter);
  };
  const openCaseDrawer = (caseId: string) => {
    onSelectCase(caseId);
    setDetailDrawerOpen(true);
  };

  // Real, downloadable PDF via the browser print dialog. Administrative ONLY —
  // case/release/delivery status, no clinical interpretation (Operations guardrail).
  const downloadReleaseRecord = (item: OperationsCaseCoordinationView) => {
    const channels = [
      /released/i.test(item.patientPortalOperationalStatus) ? t("Patient portal") : null,
      item.pdfReleaseOperationalStatus === "Released" ? t("Referring clinician (PDF)") : null,
      item.state === "CASE_CLOSED" ? t("Archive") : null,
    ].filter(Boolean).join(" · ") || "—";
    const rows: Array<[string, string]> = [
      [t("Case"), item.caseCode],
      [t("Patient"), `${tv(item.patientDisplayName)} · ${formatNumber(item.age)} ${tv("years")} · ${tv(item.sex)}`],
      [t("Release status"), tv(item.patientPortalOperationalStatus)],
      [t("Delivery channels"), channels],
      [t("Released"), tv(item.lastUpdated)],
      [t("Owner"), tv(item.currentOwner)],
    ];
    const win = window.open("", "_blank", "width=820,height=900");
    if (!win) return; // popup blocked — user can retry
    const dir = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    win.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8" /><title>${t("Release record")} ${item.caseCode}</title><style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Inter,Tahoma,sans-serif;color:#17282c;margin:0;padding:40px;}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16746b;padding-bottom:16px;margin-bottom:20px}
      .brand{font-weight:800;font-size:18px;color:#0d5d56}.brand small{display:block;font-weight:600;color:#54686b;font-size:11px;letter-spacing:.08em}
      h1{font-size:20px;margin:0 0 4px}.sub{color:#54686b;font-size:12px;margin:0}
      table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:10px 8px;border-bottom:1px solid #e4ece9;font-size:13px;vertical-align:top}
      td.k{color:#54686b;font-weight:700;width:38%}.note{margin-top:24px;padding:12px 14px;background:#f6f9f8;border:1px solid #dce8e5;border-radius:8px;color:#54686b;font-size:11.5px;line-height:1.5}
      @media print{body{padding:24px}}
    </style></head><body>
      <div class="head"><div><div class="brand">Kio<small>${t("CLINICAL AI WORKSPACE")}</small></div></div><div style="text-align:end"><h1>${t("Release record")}</h1><p class="sub">${t("Administrative — no clinical interpretation")}</p></div></div>
      <table><tbody>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>
      <div class="note">${t("This is an administrative release record generated by Operations. It records delivery status only and contains no clinical findings or interpretation. The clinical report is authored and signed by the reviewing clinicians.")}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // The referral message the patient takes to the imaging center: where to go, who
  // reviews, and what to bring. A real, printable artifact (no clinical interpretation).
  const downloadReferralPacket = (item: OperationsCaseCoordinationView) => {
    const center = directory.centers.find((entry) => entry.name === item.imagingCenter);
    const radiologist = directory.clinicians.find((entry) => entry.name === item.assignedRadiologist && entry.role === "radiologist");
    const rows: Array<[string, string]> = [
      [t("Case"), item.caseCode],
      [t("Patient"), `${tv(item.patientDisplayName)} · ${formatNumber(item.age)} ${tv("years")} · ${tv(item.sex)}`],
      [t("Refer to"), center ? `${tv(center.name)}${center.city ? ` · ${tv(center.city)}` : ""}` : (item.imagingCenter ? tv(item.imagingCenter) : "—")],
      [t("Modalities"), center ? tv(center.modalities) : "—"],
      [t("Attention"), radiologist ? `${radiologist.name}${radiologist.specialty ? ` · ${tv(radiologist.specialty)}` : ""}` : (item.assignedRadiologist && item.assignedRadiologist !== "Unassigned" ? tv(item.assignedRadiologist) : t("Radiology team"))],
      [t("Referral source"), item.referralSource ? tv(item.referralSource) : "—"],
      [t("MRI source"), tv(item.mriSource ?? "—")],
    ];
    const win = window.open("", "_blank", "width=820,height=900");
    if (!win) return;
    const dir = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    win.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8" /><title>${t("Referral packet")} ${item.caseCode}</title><style>
      *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Inter,Tahoma,sans-serif;color:#17282c;margin:0;padding:40px;}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16746b;padding-bottom:16px;margin-bottom:20px}
      .brand{font-weight:800;font-size:18px;color:#0d5d56}.brand small{display:block;font-weight:600;color:#54686b;font-size:11px;letter-spacing:.08em}
      h1{font-size:20px;margin:0 0 4px}.sub{color:#54686b;font-size:12px;margin:0}
      table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:10px 8px;border-bottom:1px solid #e4ece9;font-size:13px;vertical-align:top}
      td.k{color:#54686b;font-weight:700;width:38%}.note{margin-top:24px;padding:12px 14px;background:#f6f9f8;border:1px solid #dce8e5;border-radius:8px;color:#54686b;font-size:11.5px;line-height:1.5}
      @media print{body{padding:24px}}
    </style></head><body>
      <div class="head"><div><div class="brand">Kio<small>${t("CLINICAL AI WORKSPACE")}</small></div></div><div style="text-align:end"><h1>${t("Referral packet")}</h1><p class="sub">${t("Imaging referral — present at reception")}</p></div></div>
      <table><tbody>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>
      <div class="note">${t("Please bring this referral and a photo ID. If prior imaging is available, bring it for comparison. The imaging center will match this study to your case.")}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const detailDrawer = detailDrawerOpen ? (
    <OperationsCaseDrawer item={selected} directory={directory} onClose={() => setDetailDrawerOpen(false)} onAction={onAction} onDownloadRecord={downloadReleaseRecord} onDownloadReferral={downloadReferralPacket} />
  ) : null;

  const caseTable = (items: OperationsCaseCoordinationView[]) => (
    <div className="table-wrap">
      <table className="ops-worklist">
        <thead><tr><th>{t("Case")}</th><th>{t("Current status")}</th><th>{t("Missing / blocker")}</th><th>{t("Owner")}</th><th>{t("Next action")}</th></tr></thead>
        <tbody>
          {items.map((item) => {
            const quick = quickActionFor(item);
            return (
              <tr key={item.id} className={`prio-row prio-row-${item.priority} ${detailDrawerOpen && item.id === selected.id ? "selected-row" : ""}`} onClick={() => openCaseDrawer(item.id)}>
                <td>
                  <div className="case-cell">
                    <span className={`prio-dot prio-${item.priority}`} aria-hidden="true" />
                    <OperationsCaseIdentity item={item} />
                  </div>
                </td>
                <td><StatusChip label={item.caseStatus} /></td>
                <td className={item.operationalBlockers.length ? "blocker-cell" : ""}>{item.operationalBlockers.length ? tv(item.operationalBlockers[0]) : t("None")}</td>
                <td>{tv(item.currentOwner)}</td>
                <td>
                  <div className="row-actions">
                    {quick ? (
                      <button className="primary-button btn-compact" type="button" onClick={(event) => { event.stopPropagation(); onAction(quick.uiAction, item.id); }}>{t(quick.label)}</button>
                    ) : null}
                    <button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); openCaseDrawer(item.id); }}>{t("Open case")}</button>
                  </div>
                </td>
              </tr>
            );
          })}
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
      {createOpen ? <CreateCaseModal onClose={() => setCreateOpen(false)} onCreate={(values) => { onCreateCase(values); setCreateOpen(false); }} clinicians={directory.clinicians} centers={directory.centers} /> : null}
    </>
  );

  if (activeView === "mri") {
    const isUnmatched = (item: OperationsCaseCoordinationView) => item.operationalBlockers.some((blocker) => /match|metadata/i.test(blocker));
    const quality = caseViews.filter((item) => item.mriStatus === "Quality issue");
    const needsMatching = caseViews.filter((item) => item.mriStatus === "Received" && isUnmatched(item));
    const awaiting = caseViews.filter((item) => item.mriStatus === "Requested");
    const notReady = caseViews.filter((item) => item.mriStatus === "Missing");
    const total = quality.length + needsMatching.length + awaiting.length + notReady.length;

    const mriQueueTable = (items: OperationsCaseCoordinationView[]) => (
      <div className="table-wrap">
        <table className="ops-worklist">
          <thead><tr><th>{t("Case")}</th><th>{t("MRI source")}</th><th>{t("Scan date")}</th><th>{t("In stage since")}</th><th>{t("Issue")}</th><th>{t("Next action")}</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const quick = quickActionFor(item);
              return (
                <tr key={item.id} className={`prio-row prio-row-${item.priority} ${detailDrawerOpen && item.id === selected.id ? "selected-row" : ""}`} onClick={() => openCaseDrawer(item.id)}>
                  <td><div className="case-cell"><span className={`prio-dot prio-${item.priority}`} aria-hidden="true" /><OperationsCaseIdentity item={item} /></div></td>
                  <td>{tv(item.mriSource ?? "Not available yet")}</td>
                  <td><span dir="ltr">{item.scanDate}</span></td>
                  <td>{tv(item.lastUpdated)}</td>
                  <td className={item.operationalBlockers.length ? "blocker-cell" : ""}>{item.operationalBlockers.length ? tv(item.operationalBlockers[0]) : t("None")}</td>
                  <td>
                    <div className="row-actions">
                      {quick ? <button className="primary-button btn-compact" type="button" onClick={(event) => { event.stopPropagation(); onAction(quick.uiAction, item.id); }}>{t(quick.label)}</button> : null}
                      <button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); openCaseDrawer(item.id); }}>{t("Open case")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    const toggleMri = (key: typeof mriFilter) => setMriFilter((current) => (current === key ? "all" : key));
    const showMri = (key: typeof mriFilter) => mriFilter === "all" || mriFilter === key;
    const mriSelectedCount = { all: total, quality: quality.length, matching: needsMatching.length, awaiting: awaiting.length, notReady: notReady.length }[mriFilter];

    return (
      <>
        <PageHeader eyebrow="MRI intake" title="MRI Intake" description="Resolve missing, unmatched, or quality-flagged MRI studies before specialist review." action={mriFilter !== "all" ? <button className="text-button" type="button" onClick={() => setMriFilter("all")}>{t("Show all categories")}</button> : undefined} />
        <div className="ops-mri-stats">
          <button type="button" className={`metric-card metric-action metric-attention ${mriFilter === "quality" ? "active" : ""}`} aria-pressed={mriFilter === "quality"} onClick={() => toggleMri("quality")}><p>{t("Quality flagged")}</p><strong>{formatNumber(quality.length)}</strong><span>{t("Re-acquire or override")}</span></button>
          <button type="button" className={`metric-card metric-action metric-attention ${mriFilter === "matching" ? "active" : ""}`} aria-pressed={mriFilter === "matching"} onClick={() => toggleMri("matching")}><p>{t("Needs matching")}</p><strong>{formatNumber(needsMatching.length)}</strong><span>{t("Match study / metadata")}</span></button>
          <button type="button" className={`metric-card metric-action metric-info ${mriFilter === "awaiting" ? "active" : ""}`} aria-pressed={mriFilter === "awaiting"} onClick={() => toggleMri("awaiting")}><p>{t("Awaiting MRI")}</p><strong>{formatNumber(awaiting.length)}</strong><span>{t("Requested, not received")}</span></button>
          <button type="button" className={`metric-card metric-action metric-neutral ${mriFilter === "notReady" ? "active" : ""}`} aria-pressed={mriFilter === "notReady"} onClick={() => toggleMri("notReady")}><p>{t("Not ready")}</p><strong>{formatNumber(notReady.length)}</strong><span>{t("Upstream intake / consent")}</span></button>
        </div>
        {quality.length && showMri("quality") ? <PanelCard title="Quality flagged" subtitle="Studies received but flagged for quality — decide re-acquire or override">{mriQueueTable(quality)}</PanelCard> : null}
        {needsMatching.length && showMri("matching") ? <PanelCard title="Received — needs matching" subtitle="Study received but not yet matched to the case or missing metadata">{mriQueueTable(needsMatching)}</PanelCard> : null}
        {awaiting.length && showMri("awaiting") ? <PanelCard title="Awaiting MRI" subtitle="MRI requested from PACS or patient upload — not yet received">{mriQueueTable(awaiting)}</PanelCard> : null}
        {notReady.length && showMri("notReady") ? <PanelCard className="ops-mri-upstream" title="Not ready for MRI" subtitle="Blocked upstream on patient intake or consent — these need patient action before an MRI step">{mriQueueTable(notReady)}</PanelCard> : null}
        {total === 0 ? <EmptyState title="No MRI items need attention" message="All current studies are received, matched, and ready for review." /> : null}
        {total > 0 && mriFilter !== "all" && mriSelectedCount === 0 ? <EmptyState title="No cases in this category" message="Nothing matches this MRI category right now." action={<button className="secondary-button" type="button" onClick={() => setMriFilter("all")}>{t("Show all categories")}</button>} /> : null}
        {detailDrawer}
      </>
    );
  }

  if (activeView === "issues") {
    // Group cases that have a concrete Operations-owned next step, batched by action.
    const actionGroupOrder = ["receive-mri", "request-mri", "start-mri-intake", "complete-mri-intake", "request-consent", "request-intake", "publish", "schedule-followup", "close-case"];
    const groupsMap = new Map<string, { uiAction: string; label: string; items: OperationsCaseCoordinationView[] }>();
    for (const item of caseViews) {
      const quick = quickActionFor(item);
      if (!quick) continue;
      const group = groupsMap.get(quick.uiAction) ?? { uiAction: quick.uiAction, label: quick.label, items: [] };
      group.items.push(item);
      groupsMap.set(quick.uiAction, group);
    }
    const actionGroups = Array.from(groupsMap.values()).sort((a, b) => actionGroupOrder.indexOf(a.uiAction) - actionGroupOrder.indexOf(b.uiAction));
    const actionsReady = actionGroups.reduce((sum, group) => sum + group.items.length, 0);
    // Cases the patient/caregiver owns but Operations must chase — no direct Operations action yet.
    const waitingOnPatient = caseViews.filter((item) => item.currentOwner === "Patient / Caregiver" && item.operationalBlockers.length && !quickActionFor(item));

    const toggleAction = (key: typeof actionFilter) => setActionFilter((current) => (current === key ? "all" : key));
    const showReady = actionFilter === "all" || actionFilter === "ready";
    const showWaiting = actionFilter === "all" || actionFilter === "waiting";

    return (
      <>
        <PageHeader eyebrow="Operational attention" title="Action Center" description="Cases where Operations has a concrete next step — grouped by the action to take. Cases progressing under another role are not shown here." action={actionFilter !== "all" ? <button className="text-button" type="button" onClick={() => setActionFilter("all")}>{t("Show all")}</button> : undefined} />
        <div className="ops-actioncenter-summary">
          <button type="button" className={`metric-card metric-action metric-info ${actionFilter === "ready" ? "active" : ""}`} aria-pressed={actionFilter === "ready"} onClick={() => toggleAction("ready")}><p>{t("Actions ready")}</p><strong>{formatNumber(actionsReady)}</strong><span>{t("Operations-owned next steps")}</span></button>
          <button type="button" className={`metric-card metric-action metric-attention ${actionFilter === "waiting" ? "active" : ""}`} aria-pressed={actionFilter === "waiting"} onClick={() => toggleAction("waiting")}><p>{t("Waiting on patient")}</p><strong>{formatNumber(waitingOnPatient.length)}</strong><span>{t("Chase intake or consent")}</span></button>
        </div>
        {showReady ? actionGroups.map((group) => (
          <PanelCard key={group.uiAction} title={group.label} subtitle={`${formatNumber(group.items.length)} ${t("case(s) ready for this step")}`}>
            {caseTable(group.items)}
          </PanelCard>
        )) : null}
        {showWaiting && waitingOnPatient.length ? (
          <PanelCard className="ops-mri-upstream" title="Waiting on patient" subtitle="Owned by patient or caregiver — coordinate or remind; no direct Operations action yet">
            {caseTable(waitingOnPatient)}
          </PanelCard>
        ) : null}
        {!actionGroups.length && !waitingOnPatient.length ? (
          <EmptyState title="No operational actions right now" message="Every case is either progressing under another role or has no pending Operations step." />
        ) : null}
        {actionFilter === "ready" && actionsReady === 0 ? <EmptyState title="No actions ready" message="No case currently has a direct Operations action." action={<button className="secondary-button" type="button" onClick={() => setActionFilter("all")}>{t("Show all")}</button>} /> : null}
        {actionFilter === "waiting" && waitingOnPatient.length === 0 ? <EmptyState title="Nothing waiting on patient" message="No case is currently waiting on patient intake or consent." action={<button className="secondary-button" type="button" onClick={() => setActionFilter("all")}>{t("Show all")}</button>} /> : null}
        {detailDrawer}
      </>
    );
  }

  if (activeView === "reports") {
    // Release stages. Operations administers delivery of physician-APPROVED reports —
    // it never authors or interprets clinical content.
    const isReleased = (item: OperationsCaseCoordinationView) => /released/i.test(item.patientPortalOperationalStatus);
    const publicationApproved = caseViews.filter((item) => item.state === "PUBLICATION_APPROVED");
    const onHold = publicationApproved.filter((item) => item.operationalBlockers.length > 0);
    const readyToRelease = publicationApproved.filter((item) => item.operationalBlockers.length === 0);
    const released = caseViews.filter(isReleased);
    const awaitingApproval = caseViews.filter((item) => item.reportOperationalStatus === "Finalized · release approval pending");

    const toggleRelease = (key: typeof releaseFilter) => setReleaseFilter((current) => (current === key ? "all" : key));
    const showRel = (key: typeof releaseFilter) => releaseFilter === "all" || releaseFilter === key;

    const releaseTable = (items: OperationsCaseCoordinationView[]) => (
      <div className="table-wrap">
        <table className="ops-worklist">
          <thead><tr><th>{t("Case")}</th><th>{t("Release status")}</th><th>{t("Delivery channels")}</th><th>{t("Released")}</th><th>{t("Next action")}</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const quick = quickActionFor(item);
              const portal = isReleased(item);
              const pdf = item.pdfReleaseOperationalStatus === "Released";
              const archive = item.state === "CASE_CLOSED";
              return (
                <tr key={item.id} className={`prio-row prio-row-${item.priority} ${detailDrawerOpen && item.id === selected.id ? "selected-row" : ""}`} onClick={() => openCaseDrawer(item.id)}>
                  <td><div className="case-cell"><span className={`prio-dot prio-${item.priority}`} aria-hidden="true" /><OperationsCaseIdentity item={item} /></div></td>
                  <td><StatusChip label={item.patientPortalOperationalStatus} /></td>
                  <td>
                    <div className="release-channels">
                      <span className={`rel-chan ${portal ? "on" : ""}`}>{t("Portal")}</span>
                      <span className={`rel-chan ${pdf ? "on" : ""}`}>{t("PDF")}</span>
                      <span className={`rel-chan ${archive ? "on" : ""}`}>{t("Archive")}</span>
                    </div>
                  </td>
                  <td>{portal ? tv(item.lastUpdated) : "—"}</td>
                  <td>
                    <div className="row-actions">
                      {quick ? <button className="primary-button btn-compact" type="button" onClick={(event) => { event.stopPropagation(); onAction(quick.uiAction, item.id); }}>{t(quick.label)}</button> : null}
                      {portal ? <button className="secondary-button btn-compact" type="button" onClick={(event) => { event.stopPropagation(); downloadReleaseRecord(item); }}>{t("Release record")}</button> : null}
                      <button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); openCaseDrawer(item.id); }}>{t("Open case")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    return (
      <>
        <PageHeader eyebrow="Release administration" title="Report Release" description="Deliver physician-approved reports to their audiences — publish, distribute, and record. Clinical interpretation is authored by clinicians and stays hidden here." action={releaseFilter !== "all" ? <button className="text-button" type="button" onClick={() => setReleaseFilter("all")}>{t("Show all")}</button> : undefined} />
        <div className="release-audiences">
          <span><strong>{t("Patient / Caregiver")}</strong>{t("Patient-safe summary → portal")}</span>
          <span><strong>{t("Referring clinician")}</strong>{t("Full clinical report → PDF")}</span>
          <span><strong>{t("Record / archive")}</strong>{t("Signed version + audit")}</span>
        </div>
        <div className="ops-mri-stats">
          <button type="button" className={`metric-card metric-action metric-info ${releaseFilter === "ready" ? "active" : ""}`} aria-pressed={releaseFilter === "ready"} onClick={() => toggleRelease("ready")}><p>{t("Ready to release")}</p><strong>{formatNumber(readyToRelease.length)}</strong><span>{t("Approved — publish now")}</span></button>
          <button type="button" className={`metric-card metric-action metric-danger ${releaseFilter === "hold" ? "active" : ""}`} aria-pressed={releaseFilter === "hold"} onClick={() => toggleRelease("hold")}><p>{t("On hold")}</p><strong>{formatNumber(onHold.length)}</strong><span>{t("Release gate to clear")}</span></button>
          <button type="button" className={`metric-card metric-action metric-good ${releaseFilter === "released" ? "active" : ""}`} aria-pressed={releaseFilter === "released"} onClick={() => toggleRelease("released")}><p>{t("Released")}</p><strong>{formatNumber(released.length)}</strong><span>{t("Delivered to audiences")}</span></button>
          <button type="button" className={`metric-card metric-action metric-neutral ${releaseFilter === "awaiting" ? "active" : ""}`} aria-pressed={releaseFilter === "awaiting"} onClick={() => toggleRelease("awaiting")}><p>{t("Awaiting approval")}</p><strong>{formatNumber(awaitingApproval.length)}</strong><span>{t("With clinician — not yet ours")}</span></button>
        </div>
        {readyToRelease.length && showRel("ready") ? <PanelCard title="Ready to release" subtitle="Physician-approved — publish the patient-safe summary and deliver the clinical PDF">{releaseTable(readyToRelease)}</PanelCard> : null}
        {onHold.length && showRel("hold") ? <PanelCard title="On hold" subtitle="Approved but a release gate (consent, safety check, missing field) must be cleared first">{releaseTable(onHold)}</PanelCard> : null}
        {released.length && showRel("released") ? <PanelCard title="Released" subtitle="Delivered output — channels, release date, and re-send or amendment from the case">{releaseTable(released)}</PanelCard> : null}
        {awaitingApproval.length && showRel("awaiting") ? <PanelCard className="ops-mri-upstream" title="Awaiting clinical approval" subtitle="Report finalized but not yet approved by the clinician — shown for visibility; no Operations release action yet">{releaseTable(awaitingApproval)}</PanelCard> : null}
        {!readyToRelease.length && !onHold.length && !released.length && !awaitingApproval.length ? <EmptyState title="Nothing in the release pipeline" message="Cases appear here once a report is finalized, approved, or released." /> : null}
        {detailDrawer}
      </>
    );
  }

  if (activeView === "integrations") return (
    <>
      <Integrations
        caseRecord={selected}
        runtimeCases={caseViews
          .filter((item) => RUNTIME_ANALYSIS_BY_CASE[item.id])
          .map((item) => ({ caseId: item.id, label: `${item.caseCode} · ${tv(item.patientDisplayName)}`, analysisId: RUNTIME_ANALYSIS_BY_CASE[item.id] }))}
      />
      {detailDrawer}
    </>
  );

  if (activeView === "directory") return (
    <DirectoryView directory={directory} onSaveClinician={onSaveClinician} onSaveCenter={onSaveCenter} />
  );

  if (activeView === "followups") {
    const followUpCases = caseViews.filter((item) => Boolean(item.followUpType));
    const fuCounts = {
      all: followUpCases.length,
      Pending: followUpCases.filter((item) => item.followUpCoordination === "Pending").length,
      Scheduled: followUpCases.filter((item) => item.followUpCoordination === "Scheduled").length,
      "Reminder sent": followUpCases.filter((item) => item.followUpCoordination === "Reminder sent").length,
      Done: followUpCases.filter((item) => item.followUpCoordination === "Done").length,
    };
    const filteredFollowUps = followUpFilter === "all" ? followUpCases : followUpCases.filter((item) => item.followUpCoordination === followUpFilter);
    const fuFilters: Array<{ id: typeof followUpFilter; label: string; count: number }> = [
      { id: "all", label: "All", count: fuCounts.all },
      { id: "Pending", label: "To coordinate", count: fuCounts.Pending },
      { id: "Scheduled", label: "Scheduled", count: fuCounts.Scheduled },
      { id: "Reminder sent", label: "Reminder sent", count: fuCounts["Reminder sent"] },
      { id: "Done", label: "Coordinated", count: fuCounts.Done },
    ];
    const followUpStep = (item: OperationsCaseCoordinationView): { uiAction: string; label: string } | null => {
      switch (item.followUpCoordination) {
        case "Pending": return { uiAction: "followup-schedule", label: "Schedule appointment" };
        case "Scheduled": return { uiAction: "followup-remind", label: "Send reminder" };
        case "Reminder sent": return { uiAction: "followup-done", label: "Mark coordinated" };
        default: return null;
      }
    };

    return (
      <>
        <PageHeader eyebrow="Coordination" title="Follow-up Coordination" description="Coordinate the physician-defined review points so patients return for their next MRI or clinical review. Operations schedules and reminds — never recommends treatment." action={followUpFilter !== "all" ? <button className="text-button" type="button" onClick={() => setFollowUpFilter("all")}>{t("Show all")}</button> : undefined} />
        <div className="dir-filters" role="group" aria-label={t("Coordination state")}>
          {fuFilters.map((filter) => (
            <button key={filter.id} type="button" className={followUpFilter === filter.id ? "active" : ""} aria-pressed={followUpFilter === filter.id} onClick={() => setFollowUpFilter(filter.id)}>{t(filter.label)} <em>{formatNumber(filter.count)}</em></button>
          ))}
        </div>
        <PanelCard title="Follow-up coordination queue" subtitle="Physician-defined review points and where each one is in coordination">
          {filteredFollowUps.length ? (
            <div className="table-wrap">
              <table className="ops-worklist">
                <thead><tr><th>{t("Case")}</th><th>{t("Follow-up")}</th><th>{t("Due")}</th><th>{t("Coordination")}</th><th>{t("Next action")}</th></tr></thead>
                <tbody>
                  {filteredFollowUps.map((item) => {
                    const step = followUpStep(item);
                    return (
                      <tr key={item.id} className={detailDrawerOpen && item.id === selected.id ? "selected-row" : ""} onClick={() => openCaseDrawer(item.id)}>
                        <td><OperationsCaseIdentity item={item} /></td>
                        <td>{tv(item.followUpType ?? "—")}</td>
                        <td>{tv(item.followUpDue ?? "—")}</td>
                        <td><StatusChip label={item.followUpCoordination ?? "Pending"} /></td>
                        <td>
                          <div className="row-actions">
                            {step ? <button className="primary-button btn-compact" type="button" onClick={(event) => { event.stopPropagation(); onAction(step.uiAction, item.id); }}>{t(step.label)}</button> : <span className="muted-inline">{t("Coordinated")}</span>}
                            <button className="text-button" type="button" onClick={(event) => { event.stopPropagation(); openCaseDrawer(item.id); }}>{t("Open case")}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nothing to coordinate here" message="No physician-defined follow-up review points match this filter. They appear once a clinician sets a review point." />
          )}
        </PanelCard>
        <div className="safe-note compact">
          <strong>{t("Boundary")}</strong>
          <p>{t("Follow-up remains a physician-defined review point coordinated by Operations. The prototype tracks scheduling status; it does not recommend treatment or manage hospital-wide scheduling.")}</p>
        </div>
        {detailDrawer}
      </>
    );
  }

  return (
    <>
      <OperationsCommandBar onCreate={() => setCreateOpen(true)} />
      <OperationsKpiRow
        active={dashboardFilter}
        counts={{ all: caseViews.length, attention: attention.length, blocked: blocked.length, radiologist: radiologistQueue.length, reports: reports.length }}
        onSelect={activateDashboardFilter}
      />
      <PanelCard
        title={dashboardFilterTitles[dashboardFilter]}
        subtitle="Operational worklist — highest coordination need first"
        action={dashboardFilter !== "all" ? <button className="text-button" type="button" onClick={() => activateDashboardFilter("all")}>{t("Show all cases")}</button> : null}
      >
        {dashboardItems.length ? caseTable(dashboardItems) : <EmptyState title="No cases in this view" message="Nothing needs operational coordination in this filter right now." action={<button className="secondary-button" type="button" onClick={() => activateDashboardFilter("all")}>{t("Show all cases")}</button>} />}
      </PanelCard>
      <div className="ops-overview-band">
        <OperationsPipeline cases={caseViews} />
        <OperationsCoordinationFocus cases={caseViews} onOpen={(id) => openCaseDrawer(id)} />
      </div>
      {detailDrawer}
      {createOpen ? <CreateCaseModal onClose={() => setCreateOpen(false)} onCreate={(values) => { onCreateCase(values); setCreateOpen(false); }} clinicians={directory.clinicians} centers={directory.centers} /> : null}
    </>
  );
}

function OperationsCommandBar({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n();
  return (
    <header className="ops-command-bar">
      <div className="ops-command-copy">
        <p className="eyebrow"><span className="live-dot" aria-hidden="true" />{t("Operations Command Center")}</p>
        <h1>{t("Case flow overview")}</h1>
        <p>{t("Coordinate intake, MRI readiness, owners, blockers, and release — without clinical interpretation.")}</p>
      </div>
      <div className="ops-command-actions">
        <button className="primary-button" type="button" onClick={onCreate}>{t("Create Case")}</button>
      </div>
    </header>
  );
}

function OperationsKpiRow({
  active,
  counts,
  onSelect,
}: {
  active: DashboardFilter;
  counts: Record<"all" | "attention" | "blocked" | "radiologist" | "reports", number>;
  onSelect: (filter: DashboardFilter) => void;
}) {
  const { t, formatNumber } = useI18n();
  const cards: Array<{ id: DashboardFilter; label: string; detail: string; tone: string }> = [
    { id: "all", label: "Active cases", detail: "Across intake, review, and follow-up", tone: "info" },
    { id: "attention", label: "Need attention", detail: "Pending or waiting on coordination", tone: "attention" },
    { id: "blocked", label: "Blocked", detail: "Workflow blocker to resolve", tone: "danger" },
    { id: "radiologist", label: "Radiologist review", detail: "Routed for imaging review", tone: "neutral" },
    { id: "reports", label: "Released", detail: "Approved patient-facing output", tone: "good" },
  ];
  return (
    <div className="ops-kpi-row">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          className={`metric-card metric-action metric-${card.tone} ${active === card.id ? "active" : ""}`}
          aria-pressed={active === card.id}
          onClick={() => onSelect(card.id)}
        >
          <p>{t(card.label)}</p>
          <strong>{formatNumber(counts[card.id])}</strong>
          <span>{t(card.detail)}</span>
        </button>
      ))}
    </div>
  );
}

function OperationsPipeline({ cases }: { cases: OperationsCaseCoordinationView[] }) {
  const { t, formatNumber } = useI18n();
  const phaseOf = (item: OperationsCaseCoordinationView): CasePhase => CASE_STATE_DEFINITIONS[item.state as CaseState].phase;
  const counts = new Map<CasePhase, { total: number; blocked: number }>();
  for (const item of cases) {
    const phase = phaseOf(item);
    const entry = counts.get(phase) ?? { total: 0, blocked: 0 };
    entry.total += 1;
    if (item.priority === "blocked") entry.blocked += 1;
    counts.set(phase, entry);
  }
  const active = PHASE_ORDER.filter((phase) => (counts.get(phase)?.total ?? 0) > 0);
  const peak = Math.max(1, ...active.map((phase) => counts.get(phase)?.total ?? 0));
  return (
    <PanelCard title="Case pipeline" subtitle="Where active cases sit across the lifecycle — spot the bottleneck">
      {active.length ? (
        <ul className="ops-pipeline">
          {active.map((phase) => {
            const entry = counts.get(phase) ?? { total: 0, blocked: 0 };
            return (
              <li key={phase} className={entry.blocked ? "has-blocked" : ""}>
                <div className="ops-pipeline-label"><span>{t(PHASE_LABELS[phase])}</span><strong>{formatNumber(entry.total)}</strong></div>
                <div className="ops-pipeline-track">
                  <span className="ops-pipeline-fill" style={{ inlineSize: `${Math.round((entry.total / peak) * 100)}%` }} />
                  {entry.blocked ? <span className="ops-pipeline-fill blocked" style={{ inlineSize: `${Math.round((entry.blocked / peak) * 100)}%` }} /> : null}
                </div>
                {entry.blocked ? <small>{formatNumber(entry.blocked)} {t("blocked")}</small> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No active cases" message="New cases will appear across the pipeline as they are created." />
      )}
    </PanelCard>
  );
}

function OperationsCoordinationFocus({ cases, onOpen }: { cases: OperationsCaseCoordinationView[]; onOpen: (id: string) => void }) {
  const { t, tv } = useI18n();
  const blockedCases = cases
    .filter((item) => item.operationalBlockers.length)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return (
    <PanelCard title="Needs coordination" subtitle="Open operational blockers to clear, most urgent first">
      {blockedCases.length ? (
        <ul className="ops-focus-list">
          {blockedCases.map((item) => (
            <li key={item.id}>
              <button type="button" className="ops-focus-row" onClick={() => onOpen(item.id)}>
                <span className={`prio-dot prio-${item.priority}`} aria-hidden="true" />
                <span className="ops-focus-main">
                  <strong>{tv(item.operationalBlockers[0])}</strong>
                  <small><span dir="ltr">{item.caseCode}</span> · {tv(item.patientDisplayName)} · {tv(item.currentOwner)}</small>
                </span>
                <span className="ops-focus-go" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No open blockers" message="No case currently has an operational blocker. The queue is flowing." />
      )}
    </PanelCard>
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

const DRAWER_VISIBLE_ACTION_IDS = new Set(["receive-mri", "request-intake", "request-consent", "request-mri", "start-mri-intake", "complete-mri-intake", "assign-rad", "publish", "schedule-followup", "close-case"]);

function OperationalSummary({ item, onAction, onDownloadRecord }: { item: OperationsCaseCoordinationView; onAction: Props["onAction"]; onDownloadRecord?: (item: OperationsCaseCoordinationView) => void }) {
  const { t, tv } = useI18n();
  const availableActions = item.allowedActions.filter((action) => action.allowed && DRAWER_VISIBLE_ACTION_IDS.has(action.uiAction));
  const primaryAction = availableActions.find((action) => action.primary) ?? availableActions[0] ?? null;
  const secondaryActions = availableActions.filter((action) => action !== primaryAction);
  const blocked = item.operationalBlockers.length > 0;
  const released = /released/i.test(item.patientPortalOperationalStatus);

  // Pipeline statuses grouped into lifecycle phases so the drawer reads as progress.
  const phases: Array<{ title: string; rows: Array<{ label: string; status: string; detail?: string }> }> = [
    { title: "Intake & consent", rows: [{ label: "Intake", status: item.intakeStatus }, { label: "Consent", status: item.consentStatus }] },
    { title: "Imaging", rows: [{ label: "MRI", status: item.mriStatus, detail: item.mriSource }, { label: "Image quality", status: item.imageQualityOperationalStatus }] },
    { title: "Analysis", rows: [{ label: "AI processing", status: item.aiProcessingOperationalStatus }] },
    { title: "Clinical review", rows: [{ label: "Radiologist routing", status: item.radiologistRoutingStatus }, { label: "Physician routing", status: item.physicianRoutingStatus }] },
    { title: "Release", rows: [{ label: "Release administration", status: item.patientPortalOperationalStatus }] },
  ];

  return (
    <div className="operational-summary">
      {/* 1. The one decision: next step + the action to take it */}
      <div className={`drawer-next ${blocked ? "is-blocked" : ""}`}>
        <div className="drawer-next-copy">
          <span className="eyebrow">{t("Next operational step")}</span>
          <strong>{tv(item.nextAction)}</strong>
          {blocked ? <p className="drawer-next-blocker">{tv(item.operationalBlockers[0])}</p> : null}
        </div>
        {primaryAction ? (
          <button className="primary-button" type="button" onClick={() => onAction(primaryAction.uiAction, item.id)}>{t(primaryAction.label)}</button>
        ) : (
          <StatusChip label="No action needed" />
        )}
      </div>

      {/* 2. Where the case sits in the lifecycle */}
      <CaseJourney caseRecord={item} compact />

      {/* 3. Operational readiness, grouped by phase */}
      <div className="drawer-pipeline">
        {phases.map((phase) => (
          <div className="drawer-phase" key={phase.title}>
            <p className="drawer-phase-title">{t(phase.title)}</p>
            <div className="drawer-phase-rows">
              {phase.rows.map((row) => (
                <div className="drawer-stat" key={row.label}>
                  <span>{t(row.label)}</span>
                  <StatusChip label={row.status} />
                  {row.detail ? <small>{tv(row.detail)}</small> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Secondary actions + record export */}
      {secondaryActions.length || (released && onDownloadRecord) ? (
        <div className="drawer-more-actions">
          <span>{t("Other actions")}</span>
          {secondaryActions.map((action) => (
            <button key={action.uiAction} className="secondary-button btn-compact" type="button" onClick={() => onAction(action.uiAction, item.id)}>{t(action.label)}</button>
          ))}
          {released && onDownloadRecord ? <button className="secondary-button btn-compact" type="button" onClick={() => onDownloadRecord(item)}>{t("Download release record (PDF)")}</button> : null}
        </div>
      ) : null}

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
  directory,
  onClose,
  onAction,
  onDownloadRecord,
  onDownloadReferral,
}: {
  item: OperationsCaseCoordinationView;
  directory: Directory;
  onClose: () => void;
  onAction: Props["onAction"];
  onDownloadRecord: (item: OperationsCaseCoordinationView) => void;
  onDownloadReferral: (item: OperationsCaseCoordinationView) => void;
}) {
  const { t, tv } = useI18n();
  const [showInvite, setShowInvite] = useState(false);
  const center = directory.centers.find((entry) => entry.name === item.imagingCenter);
  const hasRadiologist = item.assignedRadiologist && item.assignedRadiologist !== "Unassigned";
  const showReferral = Boolean(item.imagingCenter) || hasRadiologist;
  const inviteSent = item.caregiverInviteStatus !== "Not invited";
  // Deterministic mock credentials for the simulated caregiver portal invite.
  const inviteOtp = String(Array.from(item.caseCode).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000, 7)).padStart(6, "0");
  const inviteLink = `kio.health/portal?c=${item.caseCode.toLowerCase()}`;
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
        </div>
        <div className="detail-drawer-body">
          <OperationalSummary item={item} onAction={onAction} onDownloadRecord={onDownloadRecord} />
          {showReferral ? (
            <section className="drawer-section">
              <div className="drawer-section-head">
                <h3>{t("Referral")}</h3>
                <p>{t("Where the patient goes and who reviews the study")}</p>
              </div>
              <div className="referral-grid">
                <div className="referral-cell">
                  <span>{t("Imaging center")}</span>
                  <strong>{item.imagingCenter ? tv(item.imagingCenter) : t("Not assigned")}</strong>
                  {center ? <small>{tv(center.city)}{center.modalities ? ` · ${tv(center.modalities)}` : ""}</small> : null}
                </div>
                <div className="referral-cell">
                  <span>{t("Attention")}</span>
                  <strong>{hasRadiologist ? tv(item.assignedRadiologist) : t("Radiology team")}</strong>
                </div>
              </div>
              <div className="drawer-demo-actions">
                <button className="secondary-button btn-compact" type="button" onClick={() => onDownloadReferral(item)}>{t("Referral packet (PDF)")}</button>
              </div>
            </section>
          ) : null}
          {item.caregiverName ? (
            <section className="drawer-section">
              <div className="drawer-section-head">
                <h3>{t("Caregiver access")}</h3>
                <p>{t("Secure portal invite — patient-safe information only")}</p>
              </div>
              <div className="referral-grid">
                <div className="referral-cell">
                  <span>{t("Caregiver")}</span>
                  <strong>{tv(item.caregiverName)}</strong>
                  {item.caregiverContact ? <small dir="ltr">{tv(item.caregiverContact)}</small> : null}
                </div>
                <div className="referral-cell">
                  <span>{t("Portal access")}</span>
                  <StatusChip label={item.caregiverInviteStatus} />
                </div>
              </div>
              <div className="drawer-demo-actions">
                <button className="secondary-button btn-compact" type="button" onClick={() => onAction("send-caregiver-invite", item.id)}>{inviteSent ? t("Resend invite") : t("Send portal invite")}</button>
                <button className="text-button" type="button" onClick={() => setShowInvite((value) => !value)}>{showInvite ? t("Hide invite message") : t("View invite message")}</button>
              </div>
              {showInvite ? (
                <div className="invite-preview">
                  <p className="invite-to"><strong>{t("To")}:</strong> <span dir="ltr">{tv(item.caregiverContact || item.caregiverName)}</span></p>
                  <p>{t("You have been invited as caregiver for")} {tv(item.patientDisplayName)}. {t("Sign in to view safe case updates.")}</p>
                  <div className="invite-creds">
                    <div><span>{t("Access link")}</span><code dir="ltr">{inviteLink}</code></div>
                    <div><span>{t("One-time code")}</span><code dir="ltr">{inviteOtp}</code></div>
                  </div>
                  <p className="invite-perms"><strong>{t("You can see")}:</strong> {t("case status, appointment reminders, and released patient-safe summaries.")} <strong>{t("Not shown")}:</strong> {t("clinical interpretation, raw AI metrics, or clinician notes.")}</p>
                </div>
              ) : null}
            </section>
          ) : null}
          <section className="drawer-section">
            <div className="drawer-section-head">
              <h3>{t("Approval and coordination timeline")}</h3>
              <p>{t("Status history and handoffs · Iranian-calendar dates in Persian mode")}</p>
            </div>
            <Timeline events={item.operationalTimeline} markCurrent />
          </section>
          <section className="drawer-section drawer-demo">
            <div className="drawer-demo-copy">
              <span className="drawer-demo-tag">{t("Prototype demo")}</span>
              <p>{t("Step this case through its lifecycle to preview how every panel reacts — no backend.")}</p>
            </div>
            <div className="drawer-demo-actions">
              <button className="text-button" type="button" onClick={() => onAction("reset-demo", item.id)}>{t("Reset")}</button>
              <button className="secondary-button btn-compact" type="button" onClick={() => onAction("advance-demo", item.id)}>{t("Advance demo case →")}</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function DirectorySearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="dir-search-field">
      <svg className="dir-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" /><line x1="15.5" y1="15.5" x2="20.5" y2="20.5" /></svg>
      <input className="directory-search" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value ? <button type="button" className="dir-search-clear" onClick={() => onChange("")} aria-label="Clear search">×</button> : null}
    </div>
  );
}

function directoryInitials(name: string): string {
  const cleaned = name.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s*/i, "").trim();
  const parts = cleaned.split(/[\s.·]+/).filter(Boolean);
  const letters = parts.map((part) => part[0]).join("");
  return (letters || name).slice(0, 2).toUpperCase();
}

function DirectoryView({ directory, onSaveClinician, onSaveCenter }: { directory: Directory; onSaveClinician: (clinician: DirectoryClinician) => void; onSaveCenter: (center: ImagingCenter) => void }) {
  const { t, tv, formatNumber } = useI18n();
  const [tab, setTab] = useState<"clinicians" | "centers">("clinicians");
  const [clinFilter, setClinFilter] = useState<"all" | ClinicianRole | "inactive">("all");
  const [centerFilter, setCenterFilter] = useState<"all" | "active" | "inactive">("all");
  const [clinSearch, setClinSearch] = useState("");
  const [centerSearch, setCenterSearch] = useState("");
  const [editClinician, setEditClinician] = useState<DirectoryClinician | null>(null);
  const [editCenter, setEditCenter] = useState<ImagingCenter | null>(null);

  const centerName = (id?: string) => directory.centers.find((center) => center.id === id)?.name ?? "";
  const clin = directory.clinicians;
  const clinCounts = {
    all: clin.length,
    radiologist: clin.filter((entry) => entry.role === "radiologist").length,
    neurologist: clin.filter((entry) => entry.role === "neurologist").length,
    inactive: clin.filter((entry) => !entry.active).length,
  };
  const ctr = directory.centers;
  const centerCounts = { all: ctr.length, active: ctr.filter((entry) => entry.active).length, inactive: ctr.filter((entry) => !entry.active).length };

  const filteredClinicians = clin.filter((entry) => {
    const query = clinSearch.trim().toLowerCase();
    const matchesQuery = !query || `${entry.name} ${entry.specialty}`.toLowerCase().includes(query);
    const matchesFilter = clinFilter === "all" ? true : clinFilter === "inactive" ? !entry.active : entry.role === clinFilter;
    return matchesQuery && matchesFilter;
  });
  const filteredCenters = ctr.filter((entry) => {
    const query = centerSearch.trim().toLowerCase();
    const matchesQuery = !query || `${entry.name} ${entry.city} ${entry.modalities}`.toLowerCase().includes(query);
    const matchesFilter = centerFilter === "all" ? true : centerFilter === "active" ? entry.active : !entry.active;
    return matchesQuery && matchesFilter;
  });

  const newClinician: DirectoryClinician = { id: "", name: "", role: "radiologist", specialty: "", centerId: undefined, active: true };
  const newCenter: ImagingCenter = { id: "", name: "", city: "", modalities: "", active: true };

  const clinFilters: Array<{ id: typeof clinFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: clinCounts.all },
    { id: "radiologist", label: "Radiologists", count: clinCounts.radiologist },
    { id: "neurologist", label: "Neurologists", count: clinCounts.neurologist },
    { id: "inactive", label: "Inactive", count: clinCounts.inactive },
  ];
  const centerFilters: Array<{ id: typeof centerFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: centerCounts.all },
    { id: "active", label: "Active", count: centerCounts.active },
    { id: "inactive", label: "Inactive", count: centerCounts.inactive },
  ];

  return (
    <>
      <PageHeader eyebrow="Back office" title="Directory" description="Manage the clinicians and imaging centers used across the platform. These feed the assignment and referral dropdowns everywhere." />

      <div className="acting-toggle dir-tabs" role="tablist" aria-label={t("Directory")}>
        <button type="button" role="tab" aria-selected={tab === "clinicians"} className={tab === "clinicians" ? "active" : ""} onClick={() => setTab("clinicians")}>{t("Clinicians")} <em>{formatNumber(clinCounts.all)}</em></button>
        <button type="button" role="tab" aria-selected={tab === "centers"} className={tab === "centers" ? "active" : ""} onClick={() => setTab("centers")}>{t("Imaging centers")} <em>{formatNumber(centerCounts.all)}</em></button>
      </div>

      {tab === "clinicians" ? (
        <PanelCard title="Clinicians" subtitle="People that cases are assigned to" action={<button className="primary-button btn-compact" type="button" onClick={() => setEditClinician(newClinician)}>{t("Add clinician")}</button>}>
          <div className="dir-filters" role="group">
            {clinFilters.map((filter) => (
              <button key={filter.id} type="button" className={clinFilter === filter.id ? "active" : ""} aria-pressed={clinFilter === filter.id} onClick={() => setClinFilter(filter.id)}>{t(filter.label)} <em>{formatNumber(filter.count)}</em></button>
            ))}
          </div>
          <div className="directory-toolbar">
            <DirectorySearch value={clinSearch} onChange={setClinSearch} placeholder={t("Search name or specialty")} />
          </div>
          {filteredClinicians.length ? (
            <div className="dir-list">
              {filteredClinicians.map((entry) => (
                <div className={`dir-row ${entry.active ? "" : "is-inactive"}`} key={entry.id}>
                  <span className={`dir-badge role-${entry.role}`} aria-hidden="true">{directoryInitials(entry.name)}</span>
                  <div className="dir-row-main">
                    <strong>{entry.name}</strong>
                    <p>{tv(entry.specialty)}{entry.centerId && centerName(entry.centerId) ? ` · ${tv(centerName(entry.centerId))}` : ""}</p>
                  </div>
                  <span className={`dir-role-badge role-${entry.role}`}>{t(entry.role === "radiologist" ? "Radiologist" : "Neurologist")}</span>
                  <button type="button" className={`dir-status ${entry.active ? "on" : "off"}`} onClick={() => onSaveClinician({ ...entry, active: !entry.active })} title={t("Toggle active")}>{t(entry.active ? "Active" : "Inactive")}</button>
                  <button className="text-button" type="button" onClick={() => setEditClinician(entry)}>{t("Edit")}</button>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No clinicians match" message="Adjust the search or filter, or add a clinician." action={<button className="secondary-button btn-compact" type="button" onClick={() => setEditClinician(newClinician)}>{t("Add clinician")}</button>} />}
        </PanelCard>
      ) : (
        <PanelCard title="Imaging centers" subtitle="Where patients are referred for the scan" action={<button className="primary-button btn-compact" type="button" onClick={() => setEditCenter(newCenter)}>{t("Add center")}</button>}>
          <div className="dir-filters" role="group">
            {centerFilters.map((filter) => (
              <button key={filter.id} type="button" className={centerFilter === filter.id ? "active" : ""} aria-pressed={centerFilter === filter.id} onClick={() => setCenterFilter(filter.id)}>{t(filter.label)} <em>{formatNumber(filter.count)}</em></button>
            ))}
          </div>
          <div className="directory-toolbar">
            <DirectorySearch value={centerSearch} onChange={setCenterSearch} placeholder={t("Search name or city")} />
          </div>
          {filteredCenters.length ? (
            <div className="dir-list">
              {filteredCenters.map((entry) => (
                <div className={`dir-row ${entry.active ? "" : "is-inactive"}`} key={entry.id}>
                  <span className="dir-badge center" aria-hidden="true">{directoryInitials(entry.name)}</span>
                  <div className="dir-row-main">
                    <strong>{tv(entry.name)}</strong>
                    <p>{tv(entry.city)}</p>
                  </div>
                  <div className="dir-modalities">
                    {entry.modalities.split("·").map((modality) => modality.trim()).filter(Boolean).map((modality) => <span key={modality}>{tv(modality)}</span>)}
                  </div>
                  <button type="button" className={`dir-status ${entry.active ? "on" : "off"}`} onClick={() => onSaveCenter({ ...entry, active: !entry.active })} title={t("Toggle active")}>{t(entry.active ? "Active" : "Inactive")}</button>
                  <button className="text-button" type="button" onClick={() => setEditCenter(entry)}>{t("Edit")}</button>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No centers match" message="Adjust the search or filter, or add an imaging center." action={<button className="secondary-button btn-compact" type="button" onClick={() => setEditCenter(newCenter)}>{t("Add center")}</button>} />}
        </PanelCard>
      )}

      {editClinician ? <ClinicianModal entry={editClinician} centers={directory.centers} onClose={() => setEditClinician(null)} onSave={(clinician) => { onSaveClinician(clinician); setEditClinician(null); }} /> : null}
      {editCenter ? <CenterModal entry={editCenter} onClose={() => setEditCenter(null)} onSave={(center) => { onSaveCenter(center); setEditCenter(null); }} /> : null}
    </>
  );
}

function ClinicianModal({ entry, centers, onClose, onSave }: { entry: DirectoryClinician; centers: ImagingCenter[]; onClose: () => void; onSave: (clinician: DirectoryClinician) => void }) {
  const { t, tv } = useI18n();
  const [draft, setDraft] = useState<DirectoryClinician>(entry);
  const canSave = draft.name.trim().length > 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ ...draft, id: draft.id || makeDirectoryId("clin", draft.name.length + 1), name: draft.name.trim(), specialty: draft.specialty.trim() });
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel directory-modal" role="dialog" aria-modal="true" aria-label={t("Clinician")}>
        <form onSubmit={submit}>
          <div className="modal-header">
            <div><p className="eyebrow">{t("Directory")}</p><h2>{entry.id ? t("Edit clinician") : t("Add clinician")}</h2></div>
            <button className="icon-close" type="button" onClick={onClose} aria-label={t("Close")}>×</button>
          </div>
          <div className="form-grid create-case-grid">
            <label className="full-width">{t("Name")} <span className="req" aria-hidden="true">*</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("e.g. Dr. N. Azadi")} autoFocus /></label>
            <label>{t("Role")}<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as ClinicianRole })}><option value="radiologist">{t("Radiologist")}</option><option value="neurologist">{t("Neurologist")}</option></select></label>
            <label>{t("Specialty")}<input value={draft.specialty} onChange={(event) => setDraft({ ...draft, specialty: event.target.value })} placeholder={t("e.g. Neuroradiology")} /></label>
            <label>{t("Center")}<select value={draft.centerId ?? ""} onChange={(event) => setDraft({ ...draft, centerId: event.target.value || undefined })}><option value="">{t("None")}</option>{centers.map((center) => <option key={center.id} value={center.id}>{tv(center.name)}</option>)}</select></label>
            <label>{t("Status")}<select value={draft.active ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "active" })}><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option></select></label>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>{t("Cancel")}</button>
            <button className="primary-button" type="submit" disabled={!canSave}>{t("Save")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CenterModal({ entry, onClose, onSave }: { entry: ImagingCenter; onClose: () => void; onSave: (center: ImagingCenter) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ImagingCenter>(entry);
  const canSave = draft.name.trim().length > 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ ...draft, id: draft.id || makeDirectoryId("ctr", draft.name.length + 1), name: draft.name.trim(), city: draft.city.trim(), modalities: draft.modalities.trim() });
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel directory-modal" role="dialog" aria-modal="true" aria-label={t("Imaging center")}>
        <form onSubmit={submit}>
          <div className="modal-header">
            <div><p className="eyebrow">{t("Directory")}</p><h2>{entry.id ? t("Edit center") : t("Add center")}</h2></div>
            <button className="icon-close" type="button" onClick={onClose} aria-label={t("Close")}>×</button>
          </div>
          <div className="form-grid create-case-grid">
            <label className="full-width">{t("Name")} <span className="req" aria-hidden="true">*</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("e.g. Mehr Imaging Center")} autoFocus /></label>
            <label>{t("City")}<input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder={t("e.g. Tehran")} /></label>
            <label>{t("Modalities")}<input value={draft.modalities} onChange={(event) => setDraft({ ...draft, modalities: event.target.value })} placeholder={t("e.g. MRI 3T · CT")} /></label>
            <label>{t("Status")}<select value={draft.active ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "active" })}><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option></select></label>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>{t("Cancel")}</button>
            <button className="primary-button" type="submit" disabled={!canSave}>{t("Save")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CreateCaseModal({ onClose, onCreate, clinicians, centers }: { onClose: () => void; onCreate: (values: CreateCaseFormValues) => void; clinicians: DirectoryClinician[]; centers: ImagingCenter[] }) {
  const { t, tv, formatNumber } = useI18n();
  const [values, setValues] = useState<CreateCaseFormValues>(defaultCreateCaseValues);
  const [showOptional, setShowOptional] = useState(false);
  const radiologists = useMemo(() => clinicians.filter((clinician) => clinician.role === "radiologist" && clinician.active), [clinicians]);
  const neurologists = useMemo(() => clinicians.filter((clinician) => clinician.role === "neurologist" && clinician.active), [clinicians]);
  const activeCenters = useMemo(() => centers.filter((center) => center.active), [centers]);

  const nameOk = values.patientName.trim().length > 0;
  const ageOk = values.age > 0;
  const referralOk = values.referralSource.trim().length > 0;
  const requiredDone = [nameOk, ageOk, referralOk].filter(Boolean).length;
  const canSubmit = requiredDone === 3;

  const update = <Key extends keyof CreateCaseFormValues>(key: Key, value: CreateCaseFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onCreate({ ...values, patientName: values.patientName.trim(), referralSource: values.referralSource.trim() });
    setValues(defaultCreateCaseValues);
  };

  const req = <span className="req" aria-hidden="true">*</span>;
  const ok = (done: boolean) => (done ? <span className="ok" aria-hidden="true">✓</span> : null);
  const hasRadiologist = values.assignedRadiologist && values.assignedRadiologist !== "Unassigned";
  const hasNeurologist = values.assignedNeurologist && values.assignedNeurologist !== "Unassigned";
  const previewChips: Array<{ key: string; label: string; value: string }> = [
    referralOk ? { key: "referral", label: "Referral", value: values.referralSource.trim() } : null,
    { key: "mri", label: "MRI", value: values.mriSource },
    values.imagingCenter ? { key: "center", label: "Center", value: values.imagingCenter } : null,
    hasRadiologist ? { key: "rad", label: "Radiologist", value: values.assignedRadiologist } : null,
    hasNeurologist ? { key: "neuro", label: "Neurologist", value: values.assignedNeurologist } : null,
    values.caregiverName?.trim() ? { key: "care", label: "Caregiver", value: values.caregiverName.trim() } : null,
  ].filter((chip): chip is { key: string; label: string; value: string } => Boolean(chip));

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel create-case-modal" role="dialog" aria-modal="true" aria-labelledby="create-case-title">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div>
              <p className="eyebrow"><span className="cc-spark" aria-hidden="true">＋</span>{t("New case")}</p>
              <h2 id="create-case-title">{t("Create case")}</h2>
              <p>{t("Open the case with a few basics now. Assignments and the rest can be set as the case progresses.")}</p>
              <div className={`cc-progress ${canSubmit ? "is-ready" : ""}`} aria-label={`${formatNumber(requiredDone)} / 3 ${t("required")}`}>
                <span className="cc-progress-track"><span style={{ inlineSize: `${(requiredDone / 3) * 100}%` }} /></span>
                <span className="cc-progress-label">{canSubmit ? t("Ready to create") : `${formatNumber(requiredDone)}/3 ${t("required")}`}</span>
              </div>
            </div>
            <button className="icon-close" type="button" onClick={onClose} aria-label={t("Close create case")}>×</button>
          </div>

          <div className="create-case-body">
            <div className="create-case-form">
              <div className="modal-section">
                <h3>{t("Case basics")}</h3>
                <div className="form-grid create-case-grid">
                  <label><span className="lbl">{t("Patient name or initials")} {req}{ok(nameOk)}</span><input className={nameOk ? "is-ok" : ""} value={values.patientName} onChange={(event) => update("patientName", event.target.value)} placeholder={t("e.g. N. Karimi")} aria-required autoFocus /></label>
                  <label><span className="lbl">{t("Age")} {req}{ok(ageOk)}</span><input className={ageOk ? "is-ok" : ""} type="number" min={1} max={120} value={values.age || ""} onChange={(event) => update("age", Number(event.target.value))} placeholder={t("e.g. 68")} aria-required /></label>
                  <label><span className="lbl">{t("Sex")}</span>
                    <div className="segmented" role="group" aria-label={t("Sex")}>
                      <button type="button" className={values.sex === "Female" ? "active" : ""} aria-pressed={values.sex === "Female"} onClick={() => update("sex", "Female")}>{t("Female")}</button>
                      <button type="button" className={values.sex === "Male" ? "active" : ""} aria-pressed={values.sex === "Male"} onClick={() => update("sex", "Male")}>{t("Male")}</button>
                    </div>
                  </label>
                  <label><span className="lbl">{t("Referral source")} {req}{ok(referralOk)}</span><input className={referralOk ? "is-ok" : ""} value={values.referralSource} onChange={(event) => update("referralSource", event.target.value)} placeholder={t("e.g. Memory clinic")} aria-required /></label>
                  <label className="full-width"><span className="lbl">{t("MRI source")}</span><select value={values.mriSource} onChange={(event) => update("mriSource", event.target.value as CreateCaseFormValues["mriSource"])}><option value="PACS">{t("PACS")}</option><option value="Patient upload link">{t("Patient upload link")}</option><option value="Not available yet">{t("Not available yet")}</option></select><small className="field-hint">{t("How the MRI study will reach the case")}</small></label>
                </div>
              </div>

              <div className="modal-section">
                <button type="button" className="modal-section-toggle" onClick={() => setShowOptional((value) => !value)} aria-expanded={showOptional}>
                  <span>{t("Assignment & notes")}</span>
                  <small>{t("Optional — defaults to Unassigned; you can set these later")}</small>
                  <em aria-hidden="true">{showOptional ? "−" : "+"}</em>
                </button>
                {showOptional ? (
                  <div className="form-grid create-case-grid">
                    <label className="full-width"><span className="lbl">{t("Imaging center")}</span><select value={values.imagingCenter} onChange={(event) => update("imagingCenter", event.target.value)}><option value="">{t("Not assigned")}</option>{activeCenters.map((center) => <option key={center.id} value={center.name}>{center.name}{center.city ? ` · ${center.city}` : ""}</option>)}</select><small className="field-hint">{t("Where the patient is referred for the scan")}</small></label>
                    <label><span className="lbl">{t("Assigned radiologist")}</span><select value={values.assignedRadiologist} onChange={(event) => update("assignedRadiologist", event.target.value)}><option value="Unassigned">{t("Unassigned")}</option>{radiologists.map((clinician) => <option key={clinician.id} value={clinician.name}>{clinician.name}</option>)}</select></label>
                    <label><span className="lbl">{t("Assigned neurologist")}</span><select value={values.assignedNeurologist} onChange={(event) => update("assignedNeurologist", event.target.value)}><option value="Unassigned">{t("Unassigned")}</option>{neurologists.map((clinician) => <option key={clinician.id} value={clinician.name}>{clinician.name}</option>)}</select></label>
                    <label><span className="lbl">{t("Caregiver name")}</span><input value={values.caregiverName} onChange={(event) => update("caregiverName", event.target.value)} placeholder={t("Optional")} /></label>
                    <label><span className="lbl">{t("Caregiver contact")}</span><input value={values.caregiverContact} onChange={(event) => update("caregiverContact", event.target.value)} placeholder={t("Optional")} /></label>
                    <label className="full-width"><span className="lbl">{t("Notes for Operations only")}</span><textarea value={values.operationsNote} onChange={(event) => update("operationsNote", event.target.value)} placeholder={t("Operational note only. Do not add clinical interpretation.")} /></label>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className="create-case-preview">
              <div className="cc-preview-card">
                <p className="cc-preview-eyebrow">{t("Live preview")}</p>
                <div className="cc-preview-head">
                  <GenderAvatar sex={values.sex} label={tv(values.sex)} />
                  <div>
                    <strong>{nameOk ? values.patientName.trim() : t("New patient")}</strong>
                    <p>{ageOk ? `${formatNumber(values.age)} ${tv("years")}` : "—"} · {tv(values.sex)}</p>
                  </div>
                </div>
                <div className="prev-chips">
                  {previewChips.map((chip) => <span className="prev-chip" key={chip.key}><i>{t(chip.label)}</i>{tv(chip.value)}</span>)}
                </div>
                <ul className="cc-checklist">
                  <li className={nameOk ? "done" : ""}><span className="cc-check">{nameOk ? "✓" : ""}</span>{t("Patient name or initials")}</li>
                  <li className={ageOk ? "done" : ""}><span className="cc-check">{ageOk ? "✓" : ""}</span>{t("Age")}</li>
                  <li className={referralOk ? "done" : ""}><span className="cc-check">{referralOk ? "✓" : ""}</span>{t("Referral source")}</li>
                </ul>
                {canSubmit ? <div className="cc-ready">{t("Ready to create")}</div> : null}
              </div>
              <div className="safe-note compact">
                <strong>{t("Operations role")}</strong>
                <p>{t("Operations opens and coordinates the case. Clinical interpretation is authored by clinicians in later steps; consent and imaging are completed in their own stages.")}</p>
              </div>
            </aside>
          </div>

          <div className="modal-actions">
            {!canSubmit ? <span className="modal-actions-hint">{t("Fill the required fields (*) to continue")}</span> : null}
            <button className="secondary-button" type="button" onClick={onClose}>{t("Cancel")}</button>
            <button className="primary-button" type="submit" disabled={!canSubmit}>{t("Create case")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
