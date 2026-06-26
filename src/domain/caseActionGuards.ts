import { createAuditEvent } from "./audit";
import { CASE_STATE_DEFINITIONS, type CaseAction, type CaseBlocker, type CaseOwnerRole, type KioRole } from "./caseState";
import { transitionCase, type CaseStatefulRecord, type TransitionContext, type TransitionResult } from "./caseTransitions";
import { canCreateCase, canTransitionCaseState, type AccessContext, type PermissionDecision } from "./permissions";
import { normalizeRoleId } from "./roles";

export type GuardedCaseActionContext = AccessContext & Omit<Partial<TransitionContext>, "actorRole"> & {
  actorRole?: TransitionContext["actorRole"];
};

export type GuardedTransitionResult<T extends CaseStatefulRecord = CaseStatefulRecord> = TransitionResult<T> & {
  deniedByPolicy?: boolean;
  denialReason?: string;
};

export type GuardedCreateCaseResult = {
  success: boolean;
  deniedByPolicy?: boolean;
  denialReason?: string;
};

export function guardCreateCase(context: AccessContext): GuardedCreateCaseResult {
  const decision = canCreateCase(context);
  return decision.allowed
    ? { success: true }
    : { success: false, deniedByPolicy: true, denialReason: safeDeniedReason(decision) };
}

export function guardCaseAction<T extends CaseStatefulRecord>(
  caseRecord: T,
  action: CaseAction,
  context: GuardedCaseActionContext,
): GuardedTransitionResult<T> {
  const normalizedRole = normalizeRoleId(context.role);
  const transitionContext = toTransitionContext(context, normalizedRole);
  const decision = canTransitionCaseState(caseRecord, action, {
    ...context,
    role: normalizedRole,
    actorRole: transitionContext.actorRole,
  });

  if (!decision.allowed) {
    const timestamp = context.timestamp ?? new Date().toISOString();
    const blockers = [permissionBlocker(decision, CASE_STATE_DEFINITIONS[caseRecord.state].primaryOwner)];
    const auditEvent = createAuditEvent({
      caseId: caseRecord.id,
      actorId: context.actorId,
      actorRole: transitionContext.actorRole,
      action,
      previousState: caseRecord.state,
      nextState: caseRecord.state,
      timestamp,
      reason: context.reason,
      success: false,
      blockerCodes: blockers.map((item) => item.code),
    });

    return {
      success: false,
      caseRecord,
      previousState: caseRecord.state,
      nextState: caseRecord.state,
      action,
      actorRole: transitionContext.actorRole,
      timestamp,
      blockers,
      auditEvent,
      reason: context.reason,
      deniedByPolicy: true,
      denialReason: blockers[0].message,
    };
  }

  return transitionCase(caseRecord, action, transitionContext);
}

export function guardCaseActionSequence<T extends CaseStatefulRecord>(
  caseRecord: T,
  steps: Array<[CaseAction, GuardedCaseActionContext]>,
): GuardedTransitionResult<T> | undefined {
  let working = caseRecord;
  let lastResult: GuardedTransitionResult<T> | undefined;

  for (const [action, context] of steps) {
    const result = guardCaseAction(working, action, context);
    if (!result.success) return result;
    working = result.caseRecord;
    lastResult = result;
  }

  if (!lastResult) return undefined;
  return {
    ...lastResult,
    caseRecord: working,
    previousState: caseRecord.state,
    nextState: working.state,
  };
}

function toTransitionContext(context: GuardedCaseActionContext, normalizedRole: KioRole): TransitionContext {
  return {
    ...context,
    actorRole: context.actorRole ?? normalizedRole,
  };
}

function permissionBlocker(decision: PermissionDecision, ownerRole: CaseOwnerRole): CaseBlocker {
  return {
    code: "PERMISSION_DENIED",
    message: safeDeniedReason(decision),
    ownerRole,
    blocking: true,
  };
}

function safeDeniedReason(decision: PermissionDecision) {
  if (!decision.reason) return "Action not allowed for this role.";
  if (decision.reason.includes("not available from")) return "This action is not available in the current case state.";
  if (decision.reason.includes("Role is not allowed")) return "Action not allowed for this role.";
  if (decision.reason.includes("Role cannot update")) return "Action not allowed for this role and case phase.";
  return decision.reason;
}
