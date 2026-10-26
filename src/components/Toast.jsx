import { useEffect } from 'react';
import { useStore } from '../state/StoreContext';

export default function Toast() {
  const { state, clearToast } = useStore();

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(clearToast, 2400);
    return () => clearTimeout(timer);
  }, [state.toast, clearToast]);

  return (
    <div className={`toast${state.toast ? ' show' : ''}`}>{state.toast || ''}</div>
  );
}
