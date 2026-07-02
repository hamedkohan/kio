// Clean line-icon set for the mobile Patient/Caregiver portals (replaces emoji).
// 24px grid, stroke = currentColor so icons inherit the surrounding colour.
import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  forms: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2.2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  uploads: (
    <>
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
      <path d="M12 15V4M8 8l4-4 4 4" />
    </>
  ),
  consent: (
    <>
      <path d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
      <path d="m9 11.5 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      <path d="m9 14.5 2 2 4-4" />
    </>
  ),
  requests: (
    <>
      <path d="M11 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
      <path d="m8.5 11 2 2 3.5-3.5M14 4.5h5v5" />
      <path d="M19 4.5 13 10.5" />
    </>
  ),
  education: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M7 12c1.5-2.5 8.5-2.5 10 0-1.5 2.5-8.5 2.5-10 0Z" />
      <circle cx="12" cy="12" r="1.6" />
    </>
  ),
  report: (
    <>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5V8h4M9 13h6M9 16.5h6" />
    </>
  ),
  heart: <path d="M12 20s-7-4.3-7-9.4A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 7 3.6c0 5.1-7 9.4-7 9.4Z" />,
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z" />
    </>
  ),
  arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
  dot: <circle cx="12" cy="12" r="3" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </>
  ),
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}
