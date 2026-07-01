// Client-side access gate for the GitHub Pages build.
//
// IMPORTANT: this is a static site — there is no server to verify a password.
// This gate keeps casual visitors out; it is NOT real security. Passwords are
// stored here only as SHA-256 hashes (never plaintext), so the literal password
// is not sitting in the JavaScript bundle, but a determined technical user could
// still bypass a client-side check. Do not put real patient data behind this.
//
// Two sign-in methods are supported:
//   - "password" — staff users (username + password, hashed with SHA-256).
//   - "otp"      — patient/caregiver users (phone number + one-time code).
//
// To add a password user: append an entry with authMethod "password", a
// passwordHash, and the panels they may open ("all" or e.g. ["physician"]).
// Generate a hash with:
//   printf '%s' 'THE-PASSWORD' | shasum -a 256 | awk '{print $1}'
//
// To add an OTP user: append an entry with authMethod "otp", a `phone`, and
// the panels they may open. See SIMULATED_OTP below for how the code check
// works while no SMS provider is connected.

import type { RoleId } from "./types";

export type PanelAccess = "all" | RoleId[];

export type AuthMethod = "password" | "otp";

export type AppUser = {
  username: string;
  authMethod: AuthMethod;
  roles: PanelAccess;
  passwordHash?: string; // SHA-256 hex of the password (password users)
  phone?: string;        // registered mobile number (OTP users)
  displayName?: string;
};

// --- User registry -------------------------------------------------------
// Master account: full access to every panel.
// To change the password, run the hash command above with the new password and
// paste the result as `passwordHash`.
export const USERS: AppUser[] = [
  {
    username: "kio",
    authMethod: "password",
    // Master password: "kiomed2026"
    passwordHash: "90ec772106c916b27638afba73e7df3718a960943b5176a8cc26d437a490a067",
    roles: "all",
    displayName: "Kio (master access)",
  },
  {
    username: "radiologist",
    authMethod: "password",
    // Password: "radiomed2026"
    passwordHash: "f517054dcac66c2029e2efe797ea98fc1602053c5c853a4394d4987465c29075",
    roles: ["radiologist"],
    displayName: "Radiologist",
  },
  {
    username: "physician",
    authMethod: "password",
    // Password: "physmed2026"
    passwordHash: "5b93d83e3c18e5f96ba69442a5a8f0fac2a527f1059258cacd75f9e6e67c4a3e",
    roles: ["physician"],
    displayName: "Physician",
  },
  {
    username: "operations",
    authMethod: "password",
    // Password: "opsmed2026"
    passwordHash: "3d926ad75fe11f9ed9fdc3c7e83d91590ebbf5aa1798b52900f765494f16b038",
    roles: ["operations"],
    displayName: "Operations",
  },
  {
    username: "research",
    authMethod: "password",
    // Password: "resmed2026"
    passwordHash: "ca10bda2a6972b188d7d482ba25f3caa2aa77840550446724c1eb4af7e5e86a8",
    roles: ["research"],
    displayName: "Research",
  },
  // OTP users — sign in with their mobile number + a one-time code.
  {
    username: "patient",
    authMethod: "otp",
    phone: "09120000001",
    roles: ["patient"],
    displayName: "Patient",
  },
  {
    username: "caregiver",
    authMethod: "otp",
    phone: "09120000002",
    roles: ["caregiver"],
    displayName: "Caregiver",
  },
];

const AUTH_STORAGE_KEY = "kio.auth.user";

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function findUser(username: string): AppUser | undefined {
  const normalized = username.trim().toLowerCase();
  return USERS.find((user) => user.username.toLowerCase() === normalized);
}

// Returns the matched user on success, or null on bad credentials.
export async function authenticate(username: string, password: string): Promise<AppUser | null> {
  const user = findUser(username);
  if (!user || user.authMethod !== "password" || !user.passwordHash) return null;
  const hash = await hashPassword(password);
  return hash === user.passwordHash ? user : null;
}

// --- OTP (phone one-time code) ------------------------------------------
// SIMULATED: no SMS provider is connected yet, so any registered phone number
// "receives" this fixed demo code. When a provider is wired up, replace this
// flow: on requestOtp() generate a random code, send it via the provider, and
// store it (server-side / with an expiry); verifyOtp() then checks the entered
// code against the stored one instead of this constant.
export const SIMULATED_OTP = "1234";

// Digits only, so "0912 000 0001" and "09120000001" compare equal.
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function findUserByPhone(phone: string): AppUser | undefined {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return USERS.find((user) => user.authMethod === "otp" && user.phone && normalizePhone(user.phone) === normalized);
}

// Step 1: "send" a code. Returns true if the phone belongs to a registered OTP
// user (i.e. a code would be sent). No code is actually transmitted in the demo.
export function requestOtp(phone: string): boolean {
  return Boolean(findUserByPhone(phone));
}

// Step 2: verify the entered code for a phone. Returns the user on success.
export function verifyOtp(phone: string, code: string): AppUser | null {
  const user = findUserByPhone(phone);
  if (!user) return null;
  return code.trim() === SIMULATED_OTP ? user : null;
}

// Registered OTP identities — used to show demo phone hints on the login screen.
export function getOtpUsers(): AppUser[] {
  return USERS.filter((user) => user.authMethod === "otp");
}

// Persist the signed-in username so the session survives a browser restart.
export function storeAuth(username: string) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, username);
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Restore a previously signed-in user (validated against the current registry).
export function getStoredUser(): AppUser | null {
  const username = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!username) return null;
  return findUser(username) ?? null;
}

// Which panels a user may open. "all" grants every role.
export function canAccessRole(user: AppUser, role: RoleId): boolean {
  return user.roles === "all" || user.roles.includes(role);
}
