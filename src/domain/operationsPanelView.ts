import type { KioCase, TimelineEvent } from "../types";
import { canPerformCaseAction, type AccessContext } from "./permissions";
import type { CaseAction, CaseState } from "./caseState";
import { getCaseBlockers, getCurrentOwnerLabel, getNextAction } from "./caseStateSelectors";

export type OperationsActionAvailability = {
  uiAction: string;
  label: string;
  domainAction?: CaseAction;
  allowed: boolean;
  reason?: string;
  primary?: boolean;
};

export type OperationsCaseCoordinationView = {
  id: string;
  caseCode: string;
  patientDisplayName: string;
  age: number;
  ageGroup: string;
  sex: KioCase["sex"];
  state: CaseState;
  stateLabel: string;
  currentOwner: string;
  nextAction: string;
  caseStatus: string;
  intakeStatus: string;
  consentStatus: string;
  mriStatus: string;
  mriSource?: string;
  imageQualityOperationalStatus: string;
  aiProcessingOperationalStatus: string;
  radiologistRoutingStatus: string;
  physicianRoutingStatus: string;
  reportOperationalStatus: string;
  patientSummaryOperationalStatus: string;
  pdfReleaseOperationalStatus: string;
  patientPortalOperationalStatus: string;
  followUpStatus: string;
  operationalBlockers: string[];
  operationalTimeline: TimelineEvent[];
  allowedActions: OperationsActionAvailability[];
  deniedActionReasons: string[];
  priority: "routine" | "attention" | "blocked";
  lastUpdated: string;
  referralSource?: string;
  assignedRadiologist: string;
  assignedNeurologist: string;
  priorImagingAvailable?: "Yes" | "No" | "Unknown";
  operationsNote?: string;
};

const operationsSafeFields = new Set<keyof OperationsCaseCoordinationView>([
  "id",
  "caseCode",
  "patientDisplayName",
  "age",
  "ageGroup",
  "sex",
  "state",
  "stateLabel",
  "currentOwner",
  "nextAction",
  "caseStatus",
  "intakeStatus",
  "consentStatus",
  "mriStatus",
  "mriSource",
  "imageQualityOperationalStatus",
  "aiProcessingOperationalStatus",
  "radiologistRoutingStatus",
  "physicianRoutingStatus",
  "reportOperationalStatus",
  "patientSummaryOperationalStatus",
  "pdfReleaseOperationalStatus",
  "patientPortalOperationalStatus",
  "followUpStatus",
  "operationalBlockers",
  "operationalTimeline",
  "allowedActions",
  "deniedActionReasons",
  "priority",
  "lastUpdated",
  "referralSource",
  "assignedRadiologist",
  "assignedNeurologist",
  "priorImagingAvailable",
  "operationsNote",
]);

const operationalActions: Array<{ uiAction: string; label: string; domainAction?: CaseAction; primary?: boolean }> = [
  { uiAction: "receive-mri", label: "Mark MRI received", domainAction: "RECEIVE_MRI", primary: true },
  { uiAction: "request-intake", label: "Request intake", domainAction: "REQUEST_PATIENT_INFORMATION" },
  { uiAction: "request-consent", label: "Request consent", domainAction: "REQUEST_CONSENT" },
  { uiAction: "request-mri", label: "Request MRI", domainAction: "REQUEST_MRI" },
  { uiAction: "start-mri-intake", label: "Start MRI intake review", domainAction: "START_MRI_INTAKE_REVIEW" },
  { uiAction: "complete-mri-intake", label: "Complete MRI intake review", domainAction: "COMPLETE_MRI_INTAKE_REVIEW" },
  { uiAction: "publish", label: "Release approved output", domainAction: "PUBLISH_TO_PATIENT_PORTAL" },
  { uiAction: "schedule-followup", label: "Schedule follow-up", domainAction: "START_FOLLOW_UP_COORDINATION" },
  { uiAction: "close-case", label: "Close case", domainAction: "CLOSE_CASE" },
  { uiAction: "assign-rad", label: "Assign radiologist" },
];

export function getOperationsCaseCoordinationView(
  caseRecord: KioCase,
  context: AccessContext = { role: "operations" },
): OperationsCaseCoordinationView {
  const operationalBlockers = getOperationsVisibleBlockers(caseRecord);
  const allowedActions = getOperationsActionAvailability(caseRecord, context);

  return {
    id: caseRecord.id,
    caseCode: caseRecord.id,
    patientDisplayName: caseRecord.patientName,
    age: caseRecord.age,
    ageGroup: caseRecord.ageGroup,
    sex: caseRecord.sex,
    state: caseRecord.state,
    stateLabel: caseRecord.caseStatus,
    currentOwner: getCurrentOwnerLabel(caseRecord),
    nextAction: getNextAction(caseRecord),
    caseStatus: caseRecord.caseStatus,
    intakeStatus: caseRecord.intakeStatus,
    consentStatus: caseRecord.consentStatus,
    mriStatus: caseRecord.mriStatus,
    mriSource: caseRecord.mriSource,
    imageQualityOperationalStatus: caseRecord.imageQuality,
    aiProcessingOperationalStatus: caseRecord.aiStatus,
    radiologistRoutingStatus: caseRecord.radiologistStatus,
    physicianRoutingStatus: caseRecord.neurologistStatus,
    reportOperationalStatus: caseRecord.reportStatus,
    patientSummaryOperationalStatus: caseRecord.patientSummaryStatus,
    pdfReleaseOperationalStatus: caseRecord.pdfReleaseStatus,
    patientPortalOperationalStatus: caseRecord.releaseStatus,
    followUpStatus: caseRecord.followUpStatus,
    operationalBlockers,
    operationalTimeline: getOperationsOperationalTimeline(caseRecord),
    allowedActions,
    deniedActionReasons: allowedActions.filter((action) => !action.allowed && action.reason).map((action) => action.reason as string),
    priority: getOperationsPriority(caseRecord, operationalBlockers),
    lastUpdated: caseRecord.stateEnteredAt ?? caseRecord.timeline.at(-1)?.date ?? "Not recorded",
    referralSource: caseRecord.referralSource,
    assignedRadiologist: caseRecord.assignedRadiologist,
    assignedNeurologist: caseRecord.assignedNeurologist,
    priorImagingAvailable: caseRecord.priorImagingAvailable,
    operationsNote: caseRecord.operationsNote,
  };
}

export function getOperationsCaseCoordinationViews(
  cases: KioCase[],
  context: AccessContext = { role: "operations" },
): OperationsCaseCoordinationView[] {
  return cases.map((caseRecord) => getOperationsCaseCoordinationView(caseRecord, context));
}

export function toOperationsSafeCaseView(caseRecord: KioCase, context: AccessContext = { role: "operations" }) {
  return getOperationsCaseCoordinationView(caseRecord, context);
}

export function getOperationsOperationalTimeline(caseRecord: KioCase): TimelineEvent[] {
  return caseRecord.timeline.map((event) => ({
    label: getSafeOperationalTimelineLabel(event.label),
    detail: getSafeOperationalTimelineDetail(event),
    date: event.date,
    tone: event.tone,
    patientSafe: event.patientSafe,
  }));
}

export function getOperationsVisibleBlockers(caseRecord: KioCase): string[] {
  const blockers = getCaseBlockers(caseRecord).filter((blocker) => blocker.blocking).map((blocker) => blocker.message);
  if (caseRecord.blocker) blockers.unshift(caseRecord.blocker);
  return Array.from(new Set(blockers)).filter(Boolean);
}

export function getOperationsActionAvailability(
  caseRecord: KioCase,
  context: AccessContext = { role: "operations" },
): OperationsActionAvailability[] {
  return operationalActions.map((action) => {
    if (!action.domainAction) {
      const allowed = action.uiAction === "assign-rad" && caseRecord.radiologistStatus === "Not ready" && caseRecord.mriStatus === "Received";
      return {
        ...action,
        allowed,
        reason: allowed ? undefined : "Assignment is not available from this operational state.",
      };
    }

    const decision = canPerformCaseAction(caseRecord, action.domainAction, context);
    return {
      ...action,
      allowed: decision.allowed,
      reason: decision.allowed ? undefined : decision.reason,
    };
  });
}

export function isOperationsSafeField(fieldName: string): fieldName is keyof OperationsCaseCoordinationView {
  return operationsSafeFields.has(fieldName as keyof OperationsCaseCoordinationView);
}

function getOperationsPriority(caseRecord: KioCase, operationalBlockers: string[]): OperationsCaseCoordinationView["priority"] {
  if (operationalBlockers.length || /failed|issue|missing|blocked/i.test(`${caseRecord.caseStatus} ${caseRecord.mriStatus}`)) return "blocked";
  if (/pending|waiting|requested|review|approval/i.test(`${caseRecord.caseStatus} ${caseRecord.nextAction}`)) return "attention";
  return "routine";
}

function getSafeOperationalTimelineLabel(label: string) {
  if (/physician|clinical/i.test(label)) return "Physician workflow updated";
  if (/radiologist|imaging/i.test(label)) return "Imaging review workflow updated";
  if (/report|summary|release/i.test(label)) return "Report release workflow updated";
  return label;
}

function getSafeOperationalTimelineDetail(event: TimelineEvent) {
  const text = `${event.label} ${event.detail}`;
  if (/physician|clinical|interpretation/i.test(text)) return "Clinical review status changed. Interpretation details are hidden from Operations.";
  if (/radiologist|imaging|segmentation|quantitative/i.test(text)) return "Imaging review status changed. Clinical evidence details are hidden from Operations.";
  if (/report|summary|release/i.test(text)) return "Report/release administration status changed. Report internals are hidden from Operations.";
  return event.detail;
}
