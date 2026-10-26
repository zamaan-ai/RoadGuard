import { useStore } from '../state/StoreContext';

export default function Notifications() {
  const { state, markAllRead, unreadCount } = useStore();

  return (
    <section id="alerts" className="page generic active">
      <div className="page-head">
        <div><span className="overline">ALERT CENTER</span><h1>Notifications</h1><p>Priority events requiring municipal attention.</p></div>
        {unreadCount > 0 && <button className="btn glass" onClick={markAllRead}>Mark all read</button>}
      </div>
      <div className="alert-list">
        {state.notifications.map((n) => (
          <article className={`panel alert-item ${n.tone}`} key={n.id} style={n.read ? { opacity: 0.6 } : undefined}>
            <b>{n.icon}</b>
            <div><h2>{n.title}</h2><p>{n.body}</p></div>
            <small>{n.time}</small>
          </article>
        ))}
        {state.notifications.length === 0 && <p style={{ color: 'var(--muted)' }}>No notifications.</p>}
      </div>
    </section>
  );
}
