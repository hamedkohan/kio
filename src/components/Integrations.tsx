import { CASE_STATE_DEFINITIONS, type CaseState } from "../domain/caseState";
import {
  AI_MODULES,
  AI_MODULE_STATUS_LABEL,
  AI_MODULE_STATUS_TONE,
  INTEGRATIONS,
  INTEGRATION_STATUS_LABEL,
  INTEGRATION_STATUS_TONE,
} from "../data/integrations";
import { useI18n } from "../i18n";
import { PageHeader, PanelCard, StatusChip } from "./ui";
import { PHASE_LABELS, PHASE_ORDER } from "./CaseJourney";
import { AiOrchestrationPanel, type RuntimeCase } from "./AiOrchestrationPanel";

type IntegrationsRecord = { state: string; caseCode?: string; patientDisplayName?: string };

// Operations integration surface: external services (NeuroTrack / MRI / BHAP / BHLP / AI / Research)
// shown as status cards anchored to the journey phase where each engages, plus the AI module registry.
export function Integrations({ caseRecord, runtimeCases = [] }: { caseRecord?: IntegrationsRecord; runtimeCases?: RuntimeCase[] }) {
  const { t, tv } = useI18n();
  const currentPhase = caseRecord ? CASE_STATE_DEFINITIONS[caseRecord.state as CaseState].phase : null;
  const currentIndex = currentPhase ? PHASE_ORDER.indexOf(currentPhase) : -1;

  const engagement = (phaseIndex: number): { label: string; tone: string } => {
    if (currentIndex < 0) return { label: "Not case-bound", tone: "neutral" };
    if (phaseIndex < currentIndex) return { label: "Engaged", tone: "ready" };
    if (phaseIndex === currentIndex) return { label: "Active now", tone: "processing" };
    return { label: "Upcoming", tone: "neutral" };
  };

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Integrations & AI modules"
        description="External services and AI capabilities mapped to the case journey. Connection status is shown per integration; AI is a registry of pluggable modules, not one fixed pipeline."
      />

      {/* Paid analysis step — the primary action, kept in the first fold. */}
      <AiOrchestrationPanel cases={runtimeCases} />

      <PanelCard
        title="Integration map"
        subtitle={caseRecord ? "Engagement is shown relative to the selected case" : "Connection status per external service"}
      >
        {caseRecord && currentPhase ? (
          <div className="integration-anchor">
            <span>{t("Relative to")}</span>
            <strong>{caseRecord.caseCode ? <span dir="ltr">{caseRecord.caseCode}</span> : null}{caseRecord.caseCode && caseRecord.patientDisplayName ? " · " : ""}{caseRecord.patientDisplayName ? tv(caseRecord.patientDisplayName) : null}</strong>
            <StatusChip label={PHASE_LABELS[currentPhase]} tone="processing" />
          </div>
        ) : null}
        <div className="integration-grid">
          {INTEGRATIONS.map((integration) => {
            const phaseIndex = PHASE_ORDER.indexOf(integration.phase);
            const relation = engagement(phaseIndex);
            return (
              <article key={integration.id} className="integration-card">
                <header>
                  <div>
                    <p className="integration-category">{t(integration.category)}</p>
                    <strong>{tv(integration.name)}</strong>
                  </div>
                  <StatusChip
                    label={INTEGRATION_STATUS_LABEL[integration.status]}
                    tone={INTEGRATION_STATUS_TONE[integration.status]}
                  />
                </header>
                <p className="integration-desc">{t(integration.description)}</p>
                <div className="integration-meta">
                  <div><span>{t("Journey step")}</span><strong>{t(PHASE_LABELS[integration.phase])}</strong></div>
                  <div><span>{t("Exchanges")}</span><strong>{t(integration.exchanges)}</strong></div>
                </div>
                <div className="integration-relation">
                  <StatusChip label={relation.label} tone={relation.tone} />
                </div>
              </article>
            );
          })}
        </div>
        <div className="safe-note">
          <strong>{t("Prototype connectivity")}</strong>
          <p>{t("Connected services exchange live data. Mock services use the designed contract with demo data. Planned services are mapped but not yet wired.")}</p>
        </div>
      </PanelCard>

      <PanelCard title="AI module registry" subtitle="Pluggable AI capabilities across the lifecycle">
        <div className="table-wrap">
          <table className="ai-registry-table">
            <thead>
              <tr>
                <th>{t("Module")}</th>
                <th>{t("Capability")}</th>
                <th>{t("Journey step")}</th>
                <th>{t("Version")}</th>
                <th>{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {AI_MODULES.map((module) => (
                <tr key={module.id}>
                  <td>
                    <strong>{tv(module.name)}</strong>
                    <span className="ai-registry-desc">{t(module.description)}</span>
                  </td>
                  <td>{t(module.capability)}</td>
                  <td>{t(PHASE_LABELS[module.phase])}</td>
                  <td dir="ltr">{module.version}</td>
                  <td>
                    <StatusChip
                      label={AI_MODULE_STATUS_LABEL[module.status]}
                      tone={AI_MODULE_STATUS_TONE[module.status]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="safe-note">
          <strong>{t("AI orchestration")}</strong>
          <p>{t("Active modules run in the current demo. Planned modules are registry slots that can be enabled without changing the journey. AI output is decision support and is always validated by a clinician before release.")}</p>
        </div>
      </PanelCard>
    </>
  );
}
