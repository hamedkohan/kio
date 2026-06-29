import { useActions, useStore } from "../store";

export function SettingsPage() {
  const { host } = useStore();
  const { updateHost } = useActions();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">This is how you appear on your booking pages.</p>
        </div>
      </div>

      <div className="settings-card">
        <label className="field">
          <span>Display name</span>
          <input value={host.name} onChange={(e) => updateHost({ name: e.target.value })} />
        </label>

        <label className="field">
          <span>Handle</span>
          <input
            value={host.handle}
            onChange={(e) =>
              updateHost({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
            }
          />
        </label>

        <label className="field">
          <span>Bio</span>
          <textarea value={host.bio} rows={3} onChange={(e) => updateHost({ bio: e.target.value })} />
        </label>

        <label className="field">
          <span>Timezone</span>
          <input value={host.timezone} onChange={(e) => updateHost({ timezone: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
