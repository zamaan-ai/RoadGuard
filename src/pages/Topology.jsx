import { useEffect, useState } from 'react';
import { api } from '../api/client';

const LEVEL_LABEL = { state: 'State node', city: 'City node', locality: 'Locality node' };
const TIER_ORDER = ['states', 'cities', 'localities'];
const TIER_TITLE = { states: 'State tier', cities: 'City tier', localities: 'Locality tier (absorbs citizen report traffic)' };

function NodeCard({ node }) {
  const up = node.status === 'up';
  return (
    <div className="panel fleet-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="overline">{LEVEL_LABEL[node.level]}</span>
          <h2 style={{ textTransform: 'capitalize' }}>{node.slug.replace(/-/g, ' ')}</h2>
        </div>
        <b className={`status ${up ? 'resolved' : 'open'}`}>
          <span
            style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: up ? 'var(--green)' : 'var(--red)',
              boxShadow: up ? '0 0 8px var(--green)' : '0 0 8px var(--red)',
              marginRight: 6,
            }}
          />
          {up ? 'Online' : 'Unreachable'}
        </b>
      </div>
      <p style={{ color: '#728ba3', fontSize: 10, margin: '10px 0 0' }}>{node.url}</p>
      <p style={{ color: '#728ba3', fontSize: 10, margin: '4px 0 0' }}>
        Requests handled: <b style={{ color: '#eaf4ff' }}>{up ? node.requestCount ?? 0 : '—'}</b>
      </p>
    </div>
  );
}

export default function Topology() {
  const [topology, setTopology] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.getTopology();
        if (!cancelled) { setTopology(data); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    const interval = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const totalNodes = topology ? TIER_ORDER.reduce((n, t) => n + topology[t].length, 0) : 0;
  const onlineNodes = topology ? TIER_ORDER.reduce((n, t) => n + topology[t].filter((x) => x.status === 'up').length, 0) : 0;

  return (
    <section id="topology" className="page generic active">
      <div className="page-head">
        <div>
          <span className="overline">DECENTRALIZED BACKEND</span>
          <h1>Node Topology</h1>
          <p>Live status of the locality → city → state node hierarchy. Each node is its own process — a traffic spike in one region can't block another's.</p>
        </div>
      </div>

      {error && <div className="panel" style={{ padding: 16, marginBottom: 14, color: '#ff7182' }}>Can't reach the gateway's topology endpoint: {error}</div>}

      {topology && (
        <div className="panel" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 24 }}>
          <div><span className="overline">NODES ONLINE</span><h2 style={{ margin: '4px 0 0' }}>{onlineNodes} / {totalNodes}</h2></div>
          <div><span className="overline">POLLING</span><h2 style={{ margin: '4px 0 0' }}>Every 4s</h2></div>
        </div>
      )}

      {topology && TIER_ORDER.map((tier) => (
        topology[tier].length > 0 && (
          <div key={tier} style={{ marginBottom: 22 }}>
            <p style={{ color: '#7890aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{TIER_TITLE[tier]}</p>
            <div className="fleet-cards">
              {topology[tier].map((node) => <NodeCard key={node.url} node={node} />)}
            </div>
          </div>
        )
      ))}

      <div className="panel" style={{ padding: 16, color: '#728ba3', fontSize: 10 }}>
        Any locality not listed above has no dedicated node yet and falls back to being handled centrally by the gateway — nothing breaks, it just isn't decentralized yet. Start the full hierarchy with <code>npm run dev:decentralized</code>.
      </div>
    </section>
  );
}
