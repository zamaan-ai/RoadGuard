import { useEffect, useState } from 'react';
import { api, setAuthToken, getAuthToken } from './api/client';
import { StoreProvider, useStore } from './state/StoreContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ReportModal from './components/ReportModal';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Reports from './pages/Reports';
import Fleet from './pages/Fleet';
import WorkOrders from './pages/WorkOrders';
import Analytics from './pages/Analytics';
import Topology from './pages/Topology';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

const PAGES = {
  dashboard: Dashboard,
  map: LiveMap,
  reports: Reports,
  fleet: Fleet,
  workorders: WorkOrders,
  analytics: Analytics,
  topology: Topology,
  alerts: Notifications,
  settings: Settings,
};

function LoadingScreen() {
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--muted, #9aa4b2)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◆</div>
        <p>Connecting to RoadGuard API…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, color: 'var(--muted, #9aa4b2)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
        <h2 style={{ color: 'inherit', marginBottom: 8 }}>Can't reach the backend</h2>
        <p style={{ marginBottom: 16 }}>{message}</p>
        <p style={{ marginBottom: 16, fontSize: '0.9em' }}>
          Start it with <code>npm run server</code> (or <code>npm run dev:full</code> to start both at once), then retry.
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );
}


function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const result = await api.login(username.trim(), password); setAuthToken(result.token); onLogin(result.user); }
    catch (err) { setError(err.message || 'Login failed'); }
    finally { setBusy(false); }
  }
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg, #030b18)' }}>
    <form onSubmit={submit} style={{ width: 'min(420px, 100%)', padding: 28, border: '1px solid #1a5275', borderRadius: 14, background: '#07182d', color: '#eaf4ff' }}>
      <div style={{ color: '#13ddf5', fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>ROADGUARD SECURE ACCESS</div>
      <h1 style={{ margin: '10px 0' }}>Sign in</h1><p style={{ color: '#7890aa' }}>Sign in with the administrator credentials configured in server/.env.</p>
      <label style={{ display: 'block', marginTop: 18 }}>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required style={loginInput}/></label>
      <label style={{ display: 'block', marginTop: 14 }}>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required style={loginInput}/></label>
      {error && <p role="alert" style={{ color: '#ff7182' }}>{error}</p>}
      <button className="btn primary full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
      <p style={{ color: '#7890aa', fontSize: 11, lineHeight: 1.5 }}>For a first local run, see README.md. Never use example credentials on an exposed server.</p>
    </form>
  </div>;
}
const loginInput = { display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 7, border: '1px solid #1c4562', background: '#061528', color: '#e7f2fc' };

function AppShell({ user, onLogout }) {
  const { state } = useStore();
  const ActivePage = PAGES[state.activePage] || Dashboard;

  if (state.loading) return <LoadingScreen />;
  if (state.loadError) return <ErrorScreen message={state.loadError} />;

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 18px', background: '#031025', borderBottom: '1px solid #12324e', color: '#7890aa', fontSize: 11 }}>
          Signed in as {user?.username || 'admin'} <button onClick={onLogout} style={{ marginLeft: 12, background: 'transparent', color: '#13ddf5', border: 0 }}>Sign out</button>
        </div>
        <Topbar />
        <section className="content">
          <ActivePage />
        </section>
      </main>
      <ReportModal />
      <Toast />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getAuthToken()));
  useEffect(() => {
    let active = true;
    if (!getAuthToken()) return;
    api.me().then(result => { if (active) setUser(result.user); })
      .catch(() => { setAuthToken(null); if (active) setUser(null); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  if (checking) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={setUser} />;
  return <StoreProvider><AppShell user={user} onLogout={() => { setAuthToken(null); setUser(null); }} /></StoreProvider>;
}
