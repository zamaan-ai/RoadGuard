import { useStore } from '../state/StoreContext';

export default function Analytics() {
  const { stats } = useStore();
  const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <section id="analytics" className="page generic active">
      <div className="page-head"><div><span className="overline">INTELLIGENCE LAYER</span><h1>RoadGuard Analytics</h1><p>Operational insights for municipal decision-making.</p></div></div>
      <div className="kpis">
        <article className="kpi blue"><div className="kpi-icon">⌁</div><div><span>Avg. Detection Time</span><strong>3.8 min</strong><small>Automated edge detection</small></div></article>
        <article className="kpi green"><div className="kpi-icon">✓</div><div><span>Resolution Rate</span><strong>{resolutionRate}%</strong><small>Closed to date</small></div></article>
        <article className="kpi moderate"><div className="kpi-icon">!</div><div><span>False Alerts</span><strong>4.2%</strong><small>After sensor fusion</small></div></article>
        <article className="kpi critical"><div className="kpi-icon">#</div><div><span>Open Work Orders</span><strong>{stats.openWorkOrders}</strong><small>Across all zones</small></div></article>
      </div>
      <article className="panel tech-panel">
        <h2>Technology Stack</h2>
        <div className="tech-grid">
          <span>◉ Computer Vision / YOLOv8</span>
          <span>◉ IMU Sensor Fusion</span>
          <span>◉ GNSS / GPS</span>
          <span>◉ Cloud Dashboard</span>
          <span>◉ 4G / 5G Connectivity</span>
          <span>◉ Edge AI Processing</span>
        </div>
      </article>
    </section>
  );
}
