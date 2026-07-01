import { useRef, useState } from "react";
import { localeLabels, locales, useI18n } from "../i18n";
import { authenticate, getOtpUsers, requestOtp, verifyOtp, type AppUser } from "../auth";

type Mode = "staff" | "otp";

// Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII 0-9 so numbers
// typed with a non-Latin keyboard are accepted and stored as "1234".
function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

// Bilingual sign-in gate shown before the role selector.
// Staff sign in with username + password; patients/caregivers with phone + OTP.
export function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: AppUser) => void }) {
  const { locale, dir, setLocale, t } = useI18n();
  const [mode, setMode] = useState<Mode>("staff");

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

      <div className="login-card">
        <p className="eyebrow">{t("Clickable product prototype")}</p>
        <h1>{t("Sign in to continue")}</h1>

        <div className="login-tabs" role="tablist" aria-label={t("Sign-in method")}>
          <button type="button" role="tab" aria-selected={mode === "staff"} className={mode === "staff" ? "active" : ""} onClick={() => setMode("staff")}>
            {t("Staff")}
          </button>
          <button type="button" role="tab" aria-selected={mode === "otp"} className={mode === "otp" ? "active" : ""} onClick={() => setMode("otp")}>
            {t("Patient / Caregiver")}
          </button>
        </div>

        {mode === "staff" ? <StaffForm onAuthenticated={onAuthenticated} /> : <OtpForm onAuthenticated={onAuthenticated} />}

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
      </div>

      <footer className="login-footer">
        <span>{t("Mock data only")}</span>
        <span>{t("Prototype access gate — not for real patient data")}</span>
      </footer>
    </main>
  );
}

function StaffForm({ onAuthenticated }: { onAuthenticated: (user: AppUser) => void }) {
  const { t } = useI18n();
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
      if (user) onAuthenticated(user);
      else setError(t("Incorrect username or password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <p className="login-lead">{t("This workspace is private. Please sign in with your access credentials.")}</p>

      <label className="login-field">
        <span>{t("Username")}</span>
        <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} required />
      </label>

      <label className="login-field">
        <span>{t("Password")}</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>

      {error ? <p className="login-error" role="alert">{error}</p> : null}

      <button type="submit" className="login-submit" disabled={busy}>{busy ? t("Signing in…") : t("Sign in")}</button>
    </form>
  );
}

const OTP_USERS = getOtpUsers();

function OtpForm({ onAuthenticated }: { onAuthenticated: (user: AppUser) => void }) {
  const { t, tv } = useI18n();
  const [identity, setIdentity] = useState(OTP_USERS[0]?.username ?? "patient");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const sendCode = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (requestOtp(phone)) {
      setStep("code");
    } else {
      setError(t("Please enter your mobile number."));
    }
  };

  const verifyCode = (value: string) => {
    setError("");
    const user = verifyOtp(identity, value);
    if (user) onAuthenticated(user);
    else setError(t("Incorrect code. Please try again."));
  };

  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    verifyCode(code);
  };

  const reset = () => {
    setStep("phone");
    setCode("");
    setError("");
  };

  if (step === "phone") {
    return (
      <form className="login-form" onSubmit={sendCode}>
        <div className="login-identity" role="group" aria-label={t("I am signing in as")}>
          {OTP_USERS.map((user) => (
            <button
              key={user.username}
              type="button"
              className={identity === user.username ? "active" : ""}
              aria-pressed={identity === user.username}
              onClick={() => setIdentity(user.username)}
            >
              {tv(user.displayName ?? user.username)}
            </button>
          ))}
        </div>

        <p className="login-lead">{t("Enter your mobile number. We'll send you a one-time code by SMS.")}</p>

        <label className="login-field">
          <span>{t("Mobile number")}</span>
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 000 0001" value={phone} onChange={(event) => setPhone(toAsciiDigits(event.target.value))} required />
        </label>

        {error ? <p className="login-error" role="alert">{error}</p> : null}

        <button type="submit" className="login-submit">{t("Send code")}</button>
      </form>
    );
  }

  return (
    <form className="login-form" onSubmit={verify}>
      <p className="login-lead">{t("We sent a one-time code to your phone. Enter it below to continue.")}</p>

      <div className="login-field">
        <span>{t("One-time code")}</span>
        <OtpCodeInput length={4} value={code} onChange={setCode} onComplete={verifyCode} />
      </div>

      {error ? <p className="login-error" role="alert">{error}</p> : null}

      <button type="submit" className="login-submit">{t("Verify & sign in")}</button>
      <button type="button" className="login-linkbutton" onClick={reset}>{t("Use a different number")}</button>
    </form>
  );
}

// Segmented one-time-code input: `length` separate single-digit boxes with
// auto-advance, backspace-to-previous, and paste support. Fires onComplete when
// every box is filled.
function OtpCodeInput({ length, value, onChange, onComplete }: { length: number; value: string; onChange: (value: string) => void; onComplete: (value: string) => void }) {
  const { t } = useI18n();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const commit = (next: string[]) => {
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length && !next.includes("")) onComplete(joined);
  };

  const focusBox = (index: number) => refs.current[index]?.focus();

  const handleChange = (index: number, raw: string) => {
    const digit = (toAsciiDigits(raw).match(/\d/g) ?? []).pop();
    if (!digit) return; // ignore non-numeric input
    const next = [...digits];
    next[index] = digit;
    commit(next);
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        commit(next);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next);
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < length - 1) {
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = (toAsciiDigits(event.clipboardData.getData("text")).match(/\d/g) ?? []).slice(0, length);
    if (!pasted.length) return;
    event.preventDefault();
    const next = Array.from({ length }, (_, index) => pasted[index] ?? "");
    commit(next);
    const firstEmpty = next.findIndex((digit) => !digit);
    focusBox(firstEmpty === -1 ? length - 1 : firstEmpty);
  };

  return (
    <div className="otp-boxes" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          aria-label={`${t("One-time code")} ${index + 1}`}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
}
