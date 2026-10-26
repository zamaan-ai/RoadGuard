import { useStore } from '../state/StoreContext';

export default function Fleet() {
  const { state, cycleFleetStatus } = useStore();
  const online = state.fleet.filter((v) => v.status !== 'Maintenance').length;

  return (
    <section id="fleet" className="page generic active">
      <div className="page-head">
        <div><span className="overline">IOT FLEET NETWORK</span><h1>Municipal Fleet</h1><p>Vehicle-mounted RoadGuard edge units and scan coverage.</p></div>
        <span className="online-pill">● {online} vehicles online</span>
      </div>
      <div className="fleet-cards">
        {state.fleet.map((v) => (
          <article className="fleet-card panel" key={v.id} onClick={() => cycleFleetStatus(v.id)} style={{ cursor: 'pointer' }} title="Click to cycle status">
            <span className="vehicle-big">{v.icon}</span>
            <h2>{v.name}</h2>
            <p>{v.route}</p>
            <b className={v.status === 'Maintenance' ? 'maintenance-text' : 'online-text'}>
              ● {v.status === 'Maintenance' ? 'In Maintenance' : `Online · ${v.status}`}
            </b>
            <div className="progress"><i style={{ width: `${v.coverage}%` }}></i></div>
            <small>{v.coverage}% route coverage</small>
          </article>
        ))}
      </div>
    </section>
  );
}
