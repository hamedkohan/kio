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
// TODO: replace the placeholder password below with the real one. To do that,
// run the hash command above with the desired password and paste the result
// as `passwordHash`. The temporary password is documented for the team.
export const USERS: AppUser[] = [
  {
    username: "kio",
    // Temporary placeholder password: "kio-demo-2026"
    passwordHash: "fb65aa2a40295cebe413d318f88672ea9c22d3bd8e5dae8e30f2c881af00619c",
    roles: "all",
    displayName: "Kio (master access)",
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
