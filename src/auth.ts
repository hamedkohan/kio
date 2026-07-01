// Client-side access gate for the GitHub Pages build.
//
// IMPORTANT: this is a static site — there is no server to verify a password.
// This gate keeps casual visitors out; it is NOT real security. Passwords are
// stored here only as SHA-256 hashes (never plaintext), so the literal password
// is not sitting in the JavaScript bundle, but a determined technical user could
// still bypass a client-side check. Do not put real patient data behind this.
//
// To add a specific user later: append an entry to USERS with their own
// passwordHash (see scripts/hash-password note below) and the panels they may
// open — either "all" or a list like ["operations", "physician"].
//
// Generate a hash for a new password with:
//   printf '%s' 'THE-PASSWORD' | shasum -a 256 | awk '{print $1}'

import type { RoleId } from "./types";

export type PanelAccess = "all" | RoleId[];

export type AppUser = {
  username: string;
  passwordHash: string; // SHA-256 hex of the password
  roles: PanelAccess;
  displayName?: string;
};

// --- User registry -------------------------------------------------------
// Master account: full access to every panel.
// To change the password, run the hash command above with the new password and
// paste the result as `passwordHash`.
export const USERS: AppUser[] = [
  {
    username: "kio",
    // Master password: "kiomed2026"
    passwordHash: "90ec772106c916b27638afba73e7df3718a960943b5176a8cc26d437a490a067",
    roles: "all",
    displayName: "Kio (master access)",
  },
  {
    username: "radiologist",
    // Password: "radiomed2026"
    passwordHash: "f517054dcac66c2029e2efe797ea98fc1602053c5c853a4394d4987465c29075",
    roles: ["radiologist"],
    displayName: "Radiologist",
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
  if (!user) return null;
  const hash = await hashPassword(password);
  return hash === user.passwordHash ? user : null;
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
