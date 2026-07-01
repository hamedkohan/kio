import type { ReactNode } from "react";
import { roleDefinitions } from "../data";
import { localeLabels, locales, useI18n } from "../i18n";
import type { RoleId } from "../types";

type NavItem = { id: string; label: string; count?: number };

export function AppShell({
  role,
  activeView,
  navItems,
  onNavigate,
  onRoleHome,
  onLogout,
  children,
  toast,
}: {
  role: RoleId;
  activeView: string;
  navItems: NavItem[];
  onNavigate: (view: string) => void;
  onRoleHome: () => void;
  onLogout?: () => void;
  children: ReactNode;
  toast?: string;
}) {
  const { locale, dir, setLocale, tv, t, formatNumber } = useI18n();
  const definition = roleDefinitions[role];
  return (
    <div className={`app-shell accent-${definition.accent}`} lang={locale} dir={dir}>
      <aside className="app-sidebar">
        <button className="brand" type="button" onClick={onRoleHome}>
          <span>K</span>
          <div>
            <strong>{t("Kio")}</strong>
            <small>{t("Clinical AI workspace")}</small>
          </div>
        </button>
        <div className="role-context">
          <span className="role-mark">{tv(definition.shortLabel).slice(0, 2)}</span>
          <div>
            <p>{t("Current workspace")}</p>
            <strong>{tv(definition.shortLabel)}</strong>
          </div>
        </div>
        <nav className="side-nav" aria-label={`${tv(definition.label)} ${t("views")}`}>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeView === item.id ? "active" : ""}
              onClick={() => onNavigate(item.id)}
            >
              <span>{tv(item.label)}</span>
              {item.count !== undefined ? <em>{formatNumber(item.count)}</em> : null}
            </button>
          ))}
        </nav>
        <div className="permission-note">
          <p>{t("Allowed view")}</p>
          <strong>{tv(definition.permission)}</strong>
        </div>
        <button className="switch-role" type="button" onClick={onRoleHome}>{t("Switch role")}</button>
        {onLogout ? <button className="logout-button sidebar-logout" type="button" onClick={onLogout}>{t("Log out")}</button> : null}
      </aside>
      <div className="app-main">
        <div className="app-topbar">
          <div>
            <span className="workspace-dot" />
            <strong>{tv(definition.label)}</strong>
            <small>{t("Local demo data · governed views")}</small>
          </div>
          <div className="topbar-actions">
            <div className="language-toggle" role="group" aria-label={t("Language")}>
              {locales.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={locale === item ? "active" : ""}
                  aria-pressed={locale === item}
                  onClick={() => setLocale(item)}
                >
                  {localeLabels[item]}
                </button>
              ))}
            </div>
            <button type="button" className="icon-button" aria-label={t("Prototype notifications placeholder")} title={t("Notifications placeholder · conditional scope")}>{t("P2")}</button>
            <span className="user-badge">{tv(definition.shortLabel).slice(0, 1)}</span>
          </div>
        </div>
        <main className="content">{children}</main>
      </div>
      {toast ? <div className="toast">{tv(toast)}</div> : null}
    </div>
  );
}
