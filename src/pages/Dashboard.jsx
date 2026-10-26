import { useMemo } from 'react';
import { useStore } from '../state/StoreContext';
import MapCanvas from '../components/MapCanvas';
import RichText from '../components/RichText';

const SEVERITY_TAG = { critical: 'redtag', moderate: 'orangetag', minor: 'greentag' };
const SEVERITY_LABEL = { critical: 'Critical', moderate: 'Moderate', minor: 'Minor' };

export default function Dashboard() {
  const { state, stats, navigate, openModal } = useStore();

  const priorityQueue = useMemo(() => (
    [...state.reports]
      .filter((r) => r.status !== 'resolved')
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  ), [state.reports]);

  const recentReports = useMemo(() => (
    [...state.reports].sort((a, b) => b.created - a.created).slice(0, 3)
  ), [state.reports]);

  const active = state.fleet.filter((v) => v.status !== 'Maintenance' && v.status !== 'Offline').length;
  const maintenance = state.fleet.filter((v) => v.status === 'Maintenance').length;

  return (
    <section id="dashboard" className="page active">
      <div className="hero">
        <div className="hero-copy">
          <div className="overline">ROADGUARD <span></span></div>
          <h1>Safer Roads,<br /><span>Stronger Communities.</span></h1>
          <p>AI-powered detection. Real-time insights. Faster repairs.</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={openModal}>Report Road Damage <b>→</b></button>
            <button className="btn glass" onClick={() => navigate('map')}>Explore Live Map</button>
          </div>
        </div>
        <div className="hero-city"><div className="sunset"></div><div className="cityline"></div><div className="scan-road"></div><div className="scan-car">🚙</div><div className="scan-ring r-a"></div><div className="scan-ring r-b"></div></div>
        <div className="system-card">
          <span className="online-dot" style={!state.connected ? { background: '#ffb52e' } : undefined}></span>
          {state.connected ? 'System Online' : 'Reconnecting…'}
          <small>Last update<br /><b>{state.connected ? 'Today · Live' : 'Live updates paused'}</b></small>
        </div>
        <div className="weather"><span>☀</span><b>28°C</b><small>Clear</small></div>
      </div>

      <div className="kpis">
        <article className="kpi critical"><div className="kpi-icon">!</div><div><span>Critical Issues</span><strong>{stats.critical}</strong><small>Require immediate attention</small></div><b>↑ 33%</b></article>
        <article className="kpi moderate"><div className="kpi-icon">!</div><div><span>Moderate Issues</span><strong>{stats.moderate}</strong><small>Schedule in next 7 days</small></div><b>↑ 12%</b></article>
        <article className="kpi blue"><div className="kpi-icon">⌁</div><div><span>Total Detections</span><strong>{stats.total}</strong><small>All monitored routes</small></div><b>↑ 18%</b></article>
        <article className="kpi green"><div className="kpi-icon">✓</div><div><span>Resolved</span><strong>{stats.resolved}</strong><small>Work orders completed</small></div><b>↑ 27%</b></article>
      </div>

      <div className="main-grid">
        <article className="panel map-panel">
          <div className="panel-title">
            <div><h2>⌖ Live Road Damage Map</h2><p>AI-detected issues across monitored routes</p></div>
            <div className="map-tools"><input placeholder="⌕ Search location..." /><select><option>All Severity</option><option>Critical</option><option>Moderate</option><option>Minor</option></select><button>⌗</button></div>
          </div>
          <MapCanvas />
        </article>

        <div className="side-stack">
          <article className="panel priority">
            <div className="panel-title"><div><h2>♧ AI Priority Queue</h2><p>Risk-ranked road issues</p></div><button className="link" onClick={() => navigate('reports')}>View All →</button></div>
            <div className="chips">
              <span className="chip red">● Critical {state.reports.filter((r) => r.severity === 'critical').length}</span>
              <span className="chip orange">● Moderate {state.reports.filter((r) => r.severity === 'moderate').length}</span>
              <span className="chip cyan">● Minor {state.reports.filter((r) => r.severity === 'minor').length}</span>
            </div>
            <table>
              <thead><tr><th>#</th><th>Location</th><th>Severity</th><th>Confidence</th></tr></thead>
              <tbody>
                {priorityQueue.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.location}</td>
                    <td><b className={`tag ${SEVERITY_TAG[r.severity]}`}>{SEVERITY_LABEL[r.severity]}</b></td>
                    <td>{r.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="panel activity">
            <div className="panel-title"><h2>♧ Recent Activity</h2><button className="link" onClick={() => navigate('alerts')}>View All →</button></div>
            {state.activity.slice(0, 4).map((a) => (
              <div className="activity-row" key={a.id}>
                <b className={`act ${a.tone}`}>{a.icon}</b>
                <span><RichText text={a.text} /></span>
                <small>{a.time}</small>
              </div>
            ))}
          </article>
        </div>
      </div>

      <div className="bottom-grid">
        <article className="panel chart-panel">
          <div className="panel-title"><div><h2>⌁ Road Damage Analytics</h2><p>Detection trend · Last 7 days</p></div><div className="period"><button className="active">7D</button><button>30D</button><button>12M</button></div></div>
          <div className="chart">
            <div className="y-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div>
            <div className="chart-area">
              <div className="gridlines"></div>
              <svg viewBox="0 0 600 190" preserveAspectRatio="none">
                <polyline points="0,142 90,125 180,118 270,93 360,108 470,76 600,54" fill="none" stroke="#18dff5" strokeWidth="4" />
                <polyline points="0,160 90,148 180,145 270,131 360,139 470,126 600,115" fill="none" stroke="#ff5068" strokeWidth="3" />
                <polyline points="0,173 90,166 180,168 270,158 360,163 470,151 600,146" fill="none" stroke="#ffb52e" strokeWidth="3" />
              </svg>
              <div className="x-axis"><span>Day 1</span><span>Day 2</span><span>Day 3</span><span>Day 4</span><span>Day 5</span><span>Day 6</span><span>Day 7</span></div>
            </div>
          </div>
          <div className="chart-legend"><span><i className="cyan"></i>Total Detections</span><span><i className="red"></i>Critical</span><span><i className="orange"></i>Moderate</span></div>
        </article>

        <article className="panel fleet-mini">
          <div className="panel-title"><h2>▰ Municipal Fleet</h2><button className="link" onClick={() => navigate('fleet')}>View All →</button></div>
          <div className="fleet-ring"><div><b>{active} / {state.fleet.length}</b><small>Active Vehicles</small></div></div>
          <div className="fleet-counts">
            <span><i className="green"></i><b>{active}</b> Active</span>
            <span><i className="orange"></i><b>{maintenance}</b> Maintenance</span>
            <span><i className="gray"></i><b>0</b> Offline</span>
          </div>
          <div className="vehicle-strip">
            {state.fleet.map((v) => (
              <span key={v.id}>{v.icon}<b>{v.id}</b><small>{v.status}</small></span>
            ))}
          </div>
        </article>

        <article className="panel reports-mini">
          <div className="panel-title"><h2>▣ Recent Reports</h2><button className="link" onClick={() => navigate('reports')}>View All →</button></div>
          {recentReports.map((r) => (
            <div className="mini-report" key={r.id}>
              <div className={`thumb ${r.severity === 'critical' ? 'pothole' : r.severity === 'moderate' ? 'crack' : 'road'}`}>
                {r.severity === 'critical' ? '●' : r.severity === 'moderate' ? '╱' : '━'}
              </div>
              <span><b>{r.damage} · {r.location}</b><small>{new Date(r.created).toLocaleDateString()} · <em>{SEVERITY_LABEL[r.severity]}</em></small></span>
              <b>›</b>
            </div>
          ))}
        </article>

        <article className="panel quick-report">
          <div className="panel-title"><h2>▣ Report Road Damage</h2><span>Quick Report</span></div>
          <div className="report-visual"><div className="camera-road">⌁</div><div><b>See a road issue?</b><p>Report it in seconds. Help us keep your city safe.</p></div></div>
          <button className="btn primary full" onClick={openModal}>Report Now <b>→</b></button>
          <button className="btn outline full" onClick={openModal}>◉ Scan with Camera</button>
        </article>
      </div>
    </section>
  );
}
