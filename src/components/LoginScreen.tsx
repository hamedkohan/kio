import { useState } from "react";
import { localeLabels, locales, useI18n } from "../i18n";
import { authenticate, type AppUser } from "../auth";

// Bilingual sign-in gate shown before the role selector.
// On success it hands the matched user back to the app, which stores the session.
export function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: AppUser) => void }) {
  const { locale, dir, setLocale, t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const user = await authenticate(username, password);
      if (user) {
        onAuthenticated(user);
      } else {
        setError(t("Incorrect username or password."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-screen" lang={locale} dir={dir}>
      <div className="login-topline">
        <div className="login-brand"><span>K</span><strong>{t("Kio")}</strong></div>
        <label className="language-switcher">
          <span>{t("Language")}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}>
            <option value="en">English</option>
            <option value="fa">فارسی</option>
          </select>
        </label>
      </div>

      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">{t("Clickable product prototype")}</p>
        <h1>{t("Sign in to continue")}</h1>
        <p className="login-lead">{t("This workspace is private. Please sign in with your access credentials.")}</p>

        <label className="login-field">
          <span>{t("Username")}</span>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="login-field">
          <span>{t("Password")}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="login-error" role="alert">{error}</p> : null}

        <button type="submit" className="login-submit" disabled={busy}>
          {busy ? t("Signing in…") : t("Sign in")}
        </button>

        <div className="login-langtoggle" role="group" aria-label={t("Language")}>
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
      </form>

      <footer className="login-footer">
        <span>{t("Mock data only")}</span>
        <span>{t("Prototype access gate — not for real patient data")}</span>
      </footer>
    </main>
  );
}
