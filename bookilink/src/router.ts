import { useSyncExternalStore } from "react";

function getHash(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Current route path, e.g. "/" or "/book/intro-call". */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, getHash, getHash);
}

export function navigate(path: string) {
  window.location.hash = path;
}

/** Builds the shareable public link for an event type slug. */
export function publicLink(slug: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/book/${slug}`;
}
