import type { CaseAction, CaseOwnerRole, CaseState, KioRole } from "./caseState";

export type AuditEvent = {
  eventId: string;
  caseId: string;
  actorId?: string;
  actorRole: KioRole | CaseOwnerRole;
  action: CaseAction;
  previousState: CaseState;
  nextState: CaseState;
  timestamp: string;
  reason?: string;
  success: boolean;
  blockerCodes?: string[];
};

export function createAuditEvent({
  caseId,
  actorId,
  actorRole,
  action,
  previousState,
  nextState,
  reason,
  success,
  blockerCodes = [],
  timestamp = new Date().toISOString(),
}: Omit<AuditEvent, "eventId"> & { timestamp?: string }) {
  return {
    eventId: `${caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    caseId,
    actorId,
    actorRole,
    action,
    previousState,
    nextState,
    timestamp,
    reason,
    success,
    blockerCodes,
  };
}
