import { navigate } from "../router";
import { useStore } from "../store";

const LINKS: { path: string; label: string }[] = [
  { path: "/", label: "Event types" },
  { path: "/bookings", label: "Bookings" },
  { path: "/settings", label: "Settings" },
];

export function NavBar({ route }: { route: string }) {
  const { host } = useStore();
  return (
    <header className="nav">
      <button className="brand" onClick={() => navigate("/")} aria-label="Bookilink home">
        <span className="brand-mark">B</span>
        <span className="brand-name">Bookilink</span>
      </button>
      <nav className="nav-links">
        {LINKS.map((l) => (
          <button
            key={l.path}
            className={"nav-link" + (route === l.path ? " is-active" : "")}
            onClick={() => navigate(l.path)}
          >
            {l.label}
          </button>
        ))}
      </nav>
      <div className="nav-host" title={host.name}>
        <span className="avatar">{host.name.charAt(0)}</span>
      </div>
    </header>
  );
}
