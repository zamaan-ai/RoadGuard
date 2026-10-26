import { useMemo } from 'react';
import { useStore, statusLabel } from '../state/StoreContext';

const SEVERITY_TAG = { critical: 'redtag', moderate: 'orangetag', minor: 'greentag' };
const SEVERITY_LABEL = { critical: 'Critical', moderate: 'Moderate', minor: 'Minor' };
const STATUS_CLASS = { open: 'open', assigned: 'assigned', repair: 'repair', resolved: 'resolved' };
const NEXT_ACTION_LABEL = { open: 'Review', assigned: 'Track', repair: 'Track', resolved: 'View' };

export default function Reports() {
  const { state, openModal, setReportSearch, setReportFilter, advanceReportStatus, showToast } = useStore();

  const filtered = useMemo(() => {
    const q = state.reportSearchTerm.toLowerCase();
    return [...state.reports]
      .sort((a, b) => b.created - a.created)
      .filter((r) => {
        const matchesText = !q || `${r.location} ${r.damage} ${r.id}`.toLowerCase().includes(q);
        const matchesFilter = state.reportSeverityFilter === 'all' || r.severity === state.reportSeverityFilter;
        return matchesText && matchesFilter;
      });
  }, [state.reports, state.reportSearchTerm, state.reportSeverityFilter]);

  function exportCsv() {
    const header = ['ID', 'Location', 'Damage', 'Severity', 'AI Score', 'Status'];
    const rows = filtered.map((r) => [r.id, r.location, r.damage, SEVERITY_LABEL[r.severity], `${r.score}%`, statusLabel(r.status)]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadguard-reports.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Exported ${filtered.length} report${filtered.length === 1 ? '' : 's'}`);
  }

  return (
    <section id="reports" className="page generic active">
      <div className="page-head">
        <div><span className="overline">INCIDENT MANAGEMENT</span><h1>Road Damage Reports</h1><p>Review, verify and prioritize detected road issues.</p></div>
        <button className="btn primary" onClick={openModal}>＋ New Report</button>
      </div>

      <div className="panel filters">
        <input
          id="reportSearch"
          placeholder="⌕ Search location or damage..."
          value={state.reportSearchTerm}
          onChange={(e) => setReportSearch(e.target.value)}
        />
        <select id="reportFilter" value={state.reportSeverityFilter} onChange={(e) => setReportFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </select>
        <button className="btn glass" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="panel table-card">
        <table className="report-table">
          <thead><tr><th>ID</th><th>Location</th><th>Damage</th><th>Severity</th><th>AI Score</th><th>Status</th><th>Handled by</th><th>Action</th></tr></thead>
          <tbody id="reportRows">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.location}</td>
                <td>{r.damage}</td>
                <td><b className={`tag ${SEVERITY_TAG[r.severity]}`}>{SEVERITY_LABEL[r.severity]}</b></td>
                <td>{r.score}%</td>
                <td><b className={`status ${STATUS_CLASS[r.status]}`}>{statusLabel(r.status)}</b></td>
                <td>
                  {r.servedBy && r.servedBy.startsWith('http') ? (
                    <b className="tag greentag" title={r.servedBy}>{r.locality || r.city || r.state || 'node'}</b>
                  ) : (
                    <b className="tag orangetag">central</b>
                  )}
                </td>
                <td>
                  <button className="tiny" disabled={r.status === 'resolved'} onClick={() => advanceReportStatus(r.id)}>
                    {NEXT_ACTION_LABEL[r.status]}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px' }}>No reports match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
