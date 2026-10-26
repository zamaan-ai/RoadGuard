import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../state/StoreContext';
import { api } from '../api/client';

const DEFAULT_CENTER = [22.5726, 88.3639]; // Kolkata map viewport only; not an incident location.
function validCoords(item) {
  const lat = Number(item?.lat ?? item?.latitude);
  const lng = Number(item?.lng ?? item?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
function pinIcon(color, label) {
  return L.divIcon({ className: 'rg-map-marker-wrap', html: `<div style="background:${color};width:26px;height:26px;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0008;display:grid;place-items:center"><span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:12px">${label}</span></div>`, iconSize: [28, 32], iconAnchor: [14, 30] });
}
const reportColors = { critical: '#ef4444', moderate: '#f59e0b', minor: '#16a34a' };

export default function MapCanvas({ large = false }) {
  const { state, setMapPopover } = useStore();
  const mapHost = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(L.layerGroup());
  const [vehicles, setVehicles] = useState([]);
  const [locationMode, setLocationMode] = useState('all');
  const [lastGps, setLastGps] = useState(null);

  useEffect(() => {
    if (!mapHost.current || mapRef.current) return;
    const map = L.map(mapHost.current, { zoomControl: true }).setView(DEFAULT_CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    layersRef.current.addTo(map);
    mapRef.current = map;
    const resize = () => map.invalidateSize();
    setTimeout(resize, 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => api.getFleetLocations().then((data) => {
      if (!alive) return;
      setVehicles(data.locations || []);
      setLastGps(data.updatedAt || null);
    }).catch(() => {});
    load();
    const timer = setInterval(load, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    const group = layersRef.current;
    group.clearLayers();
    const map = mapRef.current;
    if (!map) return;
    let count = 0;
    if (locationMode !== 'vehicles') state.reports.filter(validCoords).forEach((r) => {
      const marker = L.marker([Number(r.lat), Number(r.lng)], { icon: pinIcon(reportColors[r.severity] || '#64748b', '!') });
      marker.bindPopup(`<strong>${String(r.damage || 'Road report').replace(/[<>]/g, '')}</strong><br>${String(r.location || '').replace(/[<>]/g, '')}<br>Severity: ${r.severity || 'unknown'} · Status: ${r.status || 'unknown'}`);
      marker.addTo(group); count++;
    });
    if (locationMode !== 'reports') vehicles.filter(validCoords).forEach((v) => {
      const marker = L.marker([Number(v.lat ?? v.latitude), Number(v.lng ?? v.longitude)], { icon: pinIcon('#2563eb', 'V') });
      const age = v.updatedAt ? Math.max(0, Math.round((Date.now() - new Date(v.updatedAt).getTime()) / 1000)) : null;
      marker.bindPopup(`<strong>${String(v.vehicleId || v.id || 'Vehicle').replace(/[<>]/g, '')}</strong><br>Status: ${String(v.status || 'GPS update').replace(/[<>]/g, '')}<br>${v.simulated ? 'SIMULATED GPS — not a real vehicle' : 'GPS device feed'}${age !== null ? `<br>Last update: ${age}s ago` : ''}`);
      marker.addTo(group); count++;
    });
    if (count) {
      const points = group.getLayers().map((layer) => layer.getLatLng()).filter(Boolean);
      if (points.length && !map._roadguardDidInitialFit) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
        map._roadguardDidInitialFit = true;
      }
    }
  }, [state.reports, vehicles, locationMode]);

  const locatedReports = state.reports.filter(validCoords).length;
  const locatedVehicles = vehicles.filter(validCoords).length;
  return <div className={`map-canvas${large ? ' large' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
    <div ref={mapHost} style={{ position: 'absolute', inset: 0, zIndex: 1 }} aria-label="Live geographical map" />
    <div style={{ position: 'absolute', zIndex: 500, top: 12, left: 55, display: 'flex', gap: 8, flexWrap: 'wrap', background: '#07182de8', border: '1px solid #28617e', padding: 8, borderRadius: 8 }}>
      <select aria-label="Map layer filter" value={locationMode} onChange={(e) => setLocationMode(e.target.value)} style={{ background: '#061528', color: '#eaf4ff', border: '1px solid #28617e', padding: 6, borderRadius: 5 }}><option value="all">Incidents + vehicles</option><option value="reports">Incidents only</option><option value="vehicles">Vehicles only</option></select>
      <span style={{ color: '#d7e8f5', alignSelf: 'center', fontSize: 11 }}>Incidents with GPS: {locatedReports} · Vehicles with GPS: {locatedVehicles}</span>
    </div>
    <div style={{ position: 'absolute', zIndex: 500, bottom: 12, left: 12, background: '#07182de8', border: '1px solid #28617e', padding: '8px 10px', borderRadius: 8, color: '#d7e8f5', fontSize: 11 }}>
      <b style={{ color: '#48e3b1' }}>● Live channel</b> · GPS refresh 10s<br />
      {lastGps ? `Latest vehicle feed: ${new Date(lastGps).toLocaleTimeString()}` : 'Waiting for vehicle GPS feed'}
      {locatedReports < state.reports.length ? <div style={{ color: '#fbbf24', marginTop: 4 }}>{state.reports.length - locatedReports} report(s) lack coordinates and are not placed on the map.</div> : null}
    </div>
  </div>;
}
