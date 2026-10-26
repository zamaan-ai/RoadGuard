/** Shared filter/sort logic, used both by the central (fallback) query in
 * reportsRepo.js and by the gateway when it forwards to a regional node
 * and then applies search/severity/status filtering on the node's response. */
export function filterReports(reports, { search = '', severity = 'all', status = 'all' } = {}) {
  const q = String(search).toLowerCase();
  return [...reports]
    .sort((a, b) => b.created - a.created)
    .filter((r) => {
      const matchesText = !q || `${r.location} ${r.damage} ${r.id}`.toLowerCase().includes(q);
      const matchesSeverity = severity === 'all' || r.severity === severity;
      const matchesStatus = status === 'all' || r.status === status;
      return matchesText && matchesSeverity && matchesStatus;
    });
}
