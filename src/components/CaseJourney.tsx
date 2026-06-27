import { CASE_STATE_DEFINITIONS, type CasePhase, type CaseState } from "../domain/caseState";
import { getCaseBlockers, getCurrentOwnerLabel, getNextAction } from "../domain/caseStateSelectors";
import { useI18n } from "../i18n";
import { StatusChip } from "./ui";

// Ordered phases of the canonical case lifecycle (src/domain/caseState.ts CasePhase).
const PHASE_ORDER: CasePhase[] = [
  "case_initiation",
  "mri_intake",
  "imaging_readiness",
  "ai_processing",
  "ai_validation",
  "radiologist_review",
  "physician_review",
  "publication",
  "follow_up_closure",
  "research",
];

const PHASE_LABELS: Record<CasePhase, string> = {
  case_initiation: "Intake",
  mri_intake: "MRI Intake",
  imaging_readiness: "Imaging QC",
  ai_processing: "AI Processing",
  ai_validation: "AI Validation",
  radiologist_review: "Radiology",
  physician_review: "Neurology",
  publication: "Report & Publish",
  follow_up_closure: "Follow-up",
  research: "Research",
};

type JourneyRecord = Parameters<typeof getCurrentOwnerLabel>[0];

export function CaseJourney({ caseRecord, compact = false }: { caseRecord: JourneyRecord; compact?: boolean }) {
  const { t, tv } = useI18n();
  const definition = CASE_STATE_DEFINITIONS[caseRecord.state as CaseState];
  const currentIndex = PHASE_ORDER.indexOf(definition.phase);
  const owner = getCurrentOwnerLabel(caseRecord);
  const nextAction = getNextAction(caseRecord);
  const blockers = getCaseBlockers(caseRecord).filter((blocker) => blocker.blocking);

  const rail = (
    <ol className={compact ? "cj-rail" : "cj-rail labeled"}>
      {PHASE_ORDER.map((phase, index) => (
        <li key={phase} className={index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming"} title={t(PHASE_LABELS[phase])}>
          <span className="cj-dot" />
          {compact ? null : <span className="cj-label">{t(PHASE_LABELS[phase])}</span>}
        </li>
      ))}
    </ol>
  );

  if (compact) {
    return (
      <div className="case-journey compact" aria-label={t("Case journey")}>
        {rail}
        <div className="cj-compact-meta">
          <strong>{t(PHASE_LABELS[definition.phase])}</strong>
          <span>{tv(definition.label)}</span>
          <StatusChip label={owner} tone="info" />
        </div>
      </div>
    );
  }

  return (
    <div className="case-journey" aria-label={t("Case journey")}>
      {rail}
      <div className="cj-detail">
        <div><span>{t("Phase")}</span><strong>{t(PHASE_LABELS[definition.phase])}</strong></div>
        <div><span>{t("Current step")}</span><strong>{tv(definition.label)}</strong></div>
        <div><span>{t("Owner")}</span><StatusChip label={owner} tone="info" /></div>
        <div><span>{t("Next action")}</span><strong>{tv(nextAction)}</strong></div>
        {blockers.length ? <div><span>{t("Blocker")}</span><StatusChip label={tv(blockers[0].message)} tone="attention" /></div> : null}
      </div>
    </div>
  );
}
