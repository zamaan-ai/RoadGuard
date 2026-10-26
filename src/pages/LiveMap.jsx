import { useStore } from '../state/StoreContext';
import MapCanvas from '../components/MapCanvas';

export default function LiveMap() {
  const { openModal } = useStore();
  return (
    <section id="map" className="page generic active">
      <div className="page-head">
        <div><span className="overline">GIS COMMAND CENTER</span><h1>Live Road Map</h1><p>Monitor detected road conditions and prioritize intervention zones.</p></div>
        <button className="btn primary" onClick={openModal}>＋ New Report</button>
      </div>
      <div className="full-map panel">
        <MapCanvas large />
      </div>
    </section>
  );
}
