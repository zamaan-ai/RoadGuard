import { useState } from 'react';
import { useStore } from '../state/StoreContext';

const DAMAGE_TYPES = ['Deep Pothole', 'Large Crack', 'Road Depression', 'Surface Collapse'];

export default function ReportModal() {
  const { state, closeModal, submitReport } = useStore();
  const [location, setLocation] = useState('');
  const [damage, setDamage] = useState(DAMAGE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!state.modalOpen) return null;

  function resetForm() {
    setLocation('');
    setDescription('');
    setStateName(''); setCity(''); setLocality('');
    setFile(null);
    setError('');
  }

  async function handleSubmit() {
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitReport({ location: location.trim(), damage, description: description.trim(), photoFile: file, state: stateName.trim(), city: city.trim(), locality: locality.trim() });
      resetForm();
    } catch (err) {
      setError(err.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setError('');
    closeModal();
  }

  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card">
        <button className="close" onClick={handleClose}>×</button>
        <span className="overline">QUICK REPORT</span>
        <h1>Report Road Damage</h1>
        <p>Send a road issue to the RoadGuard municipal response system.</p>

        <label>
          Location
          <input
            value={location}
            onChange={(e) => { setLocation(e.target.value); if (error) setError(''); }}
            placeholder="e.g. Station Road"
            style={error ? { borderColor: '#ff4d68' } : undefined}
          />
        </label>

        <label>State (optional)<input value={stateName} onChange={e => setStateName(e.target.value)} placeholder="e.g. West Bengal" /></label>
        <label>City (optional)<input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Kolkata" /></label>
        <label>Locality (optional)<input value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g. Ballygunge" /></label>

        <label>
          Damage Type
          <select value={damage} onChange={(e) => setDamage(e.target.value)}>
            {DAMAGE_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
          />
        </label>

        <div className="upload">
          ▧ <b>Upload Road Photo</b>
          <small>{file?.name || 'Choose an image from your device'}</small>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        {error && <p style={{ color: '#ff4d68', fontSize: '0.85em', margin: '4px 0 0' }}>{error}</p>}

        <button className="btn primary full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Report →'}
        </button>
      </div>
    </div>
  );
}
