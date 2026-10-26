import { useStore } from '../state/StoreContext';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
  { id: 'map', icon: '⌖', label: 'Live Map' },
  { id: 'reports', icon: '▣', label: 'Road Damage Reports' },
  { id: 'fleet', icon: '▰', label: 'Fleet Monitoring' },
  { id: 'workorders', icon: '☷', label: 'Work Orders' },
  { id: 'analytics', icon: '⌁', label: 'Analytics' },
  { id: 'topology', icon: '◈', label: 'Node Topology' },
  { id: 'alerts', icon: '♢', label: 'Notifications' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  const { state, navigate, unreadCount } = useStore();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><span>◆</span></div>
        <div><strong>Road<span>Guard</span></strong><small>Safer Roads. Stronger Communities.</small></div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item${state.activePage === item.id ? ' active' : ''}`}
            onClick={() => navigate(item.id)}
          >
            <span>{item.icon}</span>{item.label}
            {item.id === 'alerts' && unreadCount > 0 && <b className="nav-badge">{unreadCount}</b>}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="road-art"><i></i><i></i><i></i></div>
        <p><b>Smarter Detection</b><br />Faster Action<br />Better Roads</p>
      </div>
    </aside>
  );
}
