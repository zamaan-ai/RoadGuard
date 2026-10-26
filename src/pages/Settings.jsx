import { useStore } from '../state/StoreContext';

export default function Settings() {
  const { state, updateSettings, saveSettings } = useStore();
  const { settings } = state;

  return (
    <section id="settings" className="page generic active">
      <div className="page-head"><div><span className="overline">ADMINISTRATION</span><h1>Settings</h1><p>RoadGuard dashboard preferences.</p></div></div>
      <article className="panel settings-card">
        <label>
          Dashboard refresh interval
          <select value={settings.refresh} onChange={(e) => updateSettings({ refresh: e.target.value })}>
            <option>Real-time</option>
            <option>Every 5 minutes</option>
            <option>Every 15 minutes</option>
          </select>
        </label>
        <label>
          Default map layer
          <select value={settings.mapLayer} onChange={(e) => updateSettings({ mapLayer: e.target.value })}>
            <option>Road Intelligence</option>
            <option>Satellite</option>
            <option>Street</option>
          </select>
        </label>
        <label>
          Critical alerts
          <input
            type="checkbox"
            checked={settings.criticalAlerts}
            onChange={(e) => updateSettings({ criticalAlerts: e.target.checked })}
          />
        </label>
        <button className="btn primary" onClick={saveSettings}>Save Settings</button>
      </article>
    </section>
  );
}
