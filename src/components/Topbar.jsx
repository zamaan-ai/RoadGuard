import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/StoreContext';

export default function Topbar() {
  const { navigate, showToast, unreadCount, globalSearchSubmit } = useStore();
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      globalSearchSubmit(value);
    }
  }

  return (
    <header className="topbar">
      <div className="search">
        <span>⌕</span>
        <input
          id="globalSearch"
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search location, road, issue..."
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-right">
        <button
          className="round"
          onClick={() => { navigate('alerts'); showToast(`♢ Showing ${unreadCount} priority notifications`); }}
        >
          ♧<em>{unreadCount}</em>
        </button>
        <div className="avatar">JD</div>
        <div className="user"><b>John Doe</b><small>Municipal Admin</small></div>
        <button className="chev">⌄</button>
      </div>
    </header>
  );
}
