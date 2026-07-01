import { useState, type ReactNode } from "react";
import { roleDefinitions } from "../data";
import { localeLabels, locales, useI18n } from "../i18n";
import type { RoleId } from "../types";
import { Icon } from "./phoneIcons";

type NavItem = { id: string; label: string; count?: number };
export type AppNotification = { title: string; detail: string; when: string };

// Nav id → line-icon name (clean SVGs, not emoji).
const NAV_ICONS: Record<string, string> = {
  status: "home",
  overview: "home",
  forms: "forms",
  uploads: "uploads",
  consent: "consent",
  followup: "calendar",
  requests: "requests",
  education: "education",
};

// App-like, mobile-first shell for the Patient and Caregiver portals:
// a phone frame with a top app bar, scrollable content, and a bottom tab bar.
export function MobileAppShell({
  role,
  activeView,
  navItems,
  onNavigate,
  onRoleHome,
  onLogout,
  canSwitchRole = true,
  children,
  toast,
  notifications = [],
}: {
  role: RoleId;
  activeView: string;
  navItems: NavItem[];
  onNavigate: (view: string) => void;
  onRoleHome: () => void;
  onLogout?: () => void;
  canSwitchRole?: boolean;
  children: ReactNode;
  toast?: string;
  notifications?: AppNotification[];
}) {
  const { locale, dir, setLocale, tv, t } = useI18n();
  const definition = roleDefinitions[role];
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className={`mobile-stage accent-${definition.accent}`} lang={locale} dir={dir}>
      <div className="phone-frame">
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-statusbar">
          <span className="phone-time">9:41</span>
          <span className="phone-statusbar-icons"><i className="sig" /><i className="wifi" /><i className="battery" /></span>
        </div>

        <header className="phone-appbar">
          {canSwitchRole ? <button type="button" className="phone-back" onClick={onRoleHome} aria-label={t("Switch role")}><Icon name="back" /></button> : <span className="phone-back phone-back-spacer" aria-hidden="true" />}
          <div className="phone-appbar-title">
            <strong>{tv(definition.label)}</strong>
            <small>{t("Kio")}</small>
          </div>
          <button type="button" className="phone-bell" onClick={() => setNotifOpen((open) => !open)} aria-label={t("Notifications")}>
            <Icon name="bell" />{notifications.length ? <em>{notifications.length}</em> : null}
          </button>
        </header>

        <div className="phone-langtoggle" role="group" aria-label={t("Language")}>
          {locales.map((item) => (
            <button key={item} type="button" className={locale === item ? "active" : ""} aria-pressed={locale === item} onClick={() => setLocale(item)}>{localeLabels[item]}</button>
          ))}
          {onLogout ? <button type="button" className="phone-logout" onClick={onLogout}>{t("Log out")}</button> : null}
        </div>

        <main className="phone-content">{children}</main>

        <nav className="phone-tabbar" aria-label={`${tv(definition.shortLabel)} ${t("views")}`}>
          {navItems.map((item) => (
            <button key={item.id} type="button" className={activeView === item.id ? "active" : ""} onClick={() => onNavigate(item.id)}>
              <span className="phone-tab-icon"><Icon name={NAV_ICONS[item.id] ?? "dot"} /></span>
              <span className="phone-tab-label">{tv(item.label)}</span>
            </button>
          ))}
        </nav>

        {notifOpen ? (
          <div className="phone-sheet-backdrop" onClick={() => setNotifOpen(false)} role="presentation">
            <div className="phone-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="phone-sheet-handle" />
              <h3>{t("Notifications")}</h3>
              {notifications.length ? (
                <ul className="phone-notif-list">
                  {notifications.map((notif, index) => (
                    <li key={index}>
                      <strong>{tv(notif.title)}</strong>
                      <p>{tv(notif.detail)}</p>
                      <small>{tv(notif.when)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="phone-notif-empty">{t("No new notifications. We'll let you know when something needs your attention.")}</p>
              )}
              <p className="phone-notif-note">{t("In the live app these arrive as push notifications on your phone.")}</p>
            </div>
          </div>
        ) : null}

        {toast ? <div className="phone-toast">{tv(toast)}</div> : null}
      </div>
    </div>
  );
}
