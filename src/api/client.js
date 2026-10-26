// Thin fetch wrapper around the RoadGuard backend REST API.
// In dev, Vite proxies /api and /uploads to http://localhost:4000 (see vite.config.js),
// so relative paths work without any CORS configuration.

const BASE = '/api';

let authToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roadguard_token') : null;
export function setAuthToken(token) {
  authToken = token || null;
  if (typeof sessionStorage !== 'undefined') {
    if (authToken) sessionStorage.setItem('roadguard_token', authToken);
    else sessionStorage.removeItem('roadguard_token');
  }
}
export function getAuthToken() { return authToken; }

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  // Reports
  getReports: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return request(`/reports${qs ? `?${qs}` : ''}`);
  },
  submitReport: ({ location, damage, description, photoFile, state, city, locality, lat, lng }) => {
    const form = new FormData();
    form.append('location', location);
    form.append('damage', damage);
    form.append('description', description || '');
    if (state) form.append('state', state);
    if (city) form.append('city', city);
    if (locality) form.append('locality', locality);
    if (lat !== undefined && lat !== '') form.append('lat', String(lat));
    if (lng !== undefined && lng !== '') form.append('lng', String(lng));
    if (photoFile) form.append('photo', photoFile);
    return request('/reports', { method: 'POST', body: form, isForm: true });
  },
  advanceReport: (id) => request(`/reports/${id}/advance`, { method: 'PATCH' }),

  // Fleet
  getFleet: () => request('/fleet'),
  getFleetLocations: () => request('/fleet/locations'),
  cycleFleetStatus: (id) => request(`/fleet/${id}/status`, { method: 'PATCH' }),

  // Workflow / work orders
  getWorkflow: () => request('/workflow'),
  advanceWorkflow: () => request('/workflow/advance', { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markAllRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  // Activity
  getActivity: (limit) => request(`/activity${limit ? `?limit=${limit}` : ''}`),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (payload) => request('/settings', { method: 'PUT', body: payload }),

  // Stats / analytics
  getStats: () => request('/stats'),
  getAnalytics: () => request('/stats/analytics'),

  // Node topology (decentralization proof)
  getTopology: () => request('/topology'),
};
