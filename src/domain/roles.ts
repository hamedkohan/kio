import type { RoleId as UiRoleId } from "../types";

export type RoleId =
  | "operations_coordinator"
  | "radiologist"
  | "neuroradiologist"
  | "mri_scientist_ai_qa"
  | "physician_neurologist"
  | "patient"
  | "caregiver"
  | "external_guest_reviewer"
  | "psychologist_neuropsychologist_guest"
  | "researcher"
  | "data_steward_research_admin"
  | "organization_admin";

export type RoleGroup =
  | "operations"
  | "imaging_clinical"
  | "imaging_technical"
  | "clinical"
  | "participant"
  | "guest"
  | "research"
  | "admin";

export type RoleCompatibilityMap = Record<UiRoleId, RoleId>;

export const ROLE_COMPATIBILITY_MAP: RoleCompatibilityMap = {
  operations: "operations_coordinator",
  radiologist: "radiologist",
  physician: "physician_neurologist",
  patient: "patient",
  caregiver: "caregiver",
  research: "researcher",
};

export const ROLE_GROUPS: Record<RoleId, RoleGroup> = {
  operations_coordinator: "operations",
  radiologist: "imaging_clinical",
  neuroradiologist: "imaging_clinical",
  mri_scientist_ai_qa: "imaging_technical",
  physician_neurologist: "clinical",
  patient: "participant",
  caregiver: "participant",
  external_guest_reviewer: "guest",
  psychologist_neuropsychologist_guest: "guest",
  researcher: "research",
  data_steward_research_admin: "research",
  organization_admin: "admin",
};

export function normalizeRoleId(role: RoleId | UiRoleId | string): RoleId {
  if (role in ROLE_COMPATIBILITY_MAP) return ROLE_COMPATIBILITY_MAP[role as UiRoleId];
  if (role === "radiologist_neuroradiologist") return "radiologist";
  if (role === "psychologist_neuropsychologist_guest_reviewer") return "psychologist_neuropsychologist_guest";
  return isRoleId(role) ? role : "operations_coordinator";
}

export function isRoleId(role: string): role is RoleId {
  return role in ROLE_GROUPS;
}

export function getRoleGroup(role: RoleId | UiRoleId | string): RoleGroup {
  return ROLE_GROUPS[normalizeRoleId(role)];
}

export function isClinicalRole(role: RoleId | UiRoleId | string) {
  const normalized = normalizeRoleId(role);
  return normalized === "physician_neurologist" || normalized === "radiologist" || normalized === "neuroradiologist";
}

export function isImagingReviewRole(role: RoleId | UiRoleId | string) {
  const normalized = normalizeRoleId(role);
  return normalized === "radiologist" || normalized === "neuroradiologist";
}

export function isTechnicalQaRole(role: RoleId | UiRoleId | string) {
  return normalizeRoleId(role) === "mri_scientist_ai_qa";
}
