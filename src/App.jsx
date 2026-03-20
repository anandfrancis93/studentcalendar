import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from './context/AppContext';
import { clearState } from './utils/storage';
import { parseICS } from './utils/icsParser';
import Onboarding from './components/Onboarding/Onboarding';
import Calendar from './components/Calendar/Calendar';
import TipsSidebar from './components/Tips/TipsSidebar';
import Chatbot from './components/Chatbot/Chatbot';
import IntegrationsPanel from './components/Integrations/IntegrationsPanel';
import './App.css';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

async function fetchICSFeed(feedUrl) {
  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(feedUrl), {
        headers: { Accept: 'text/calendar, text/plain, */*' },
      });
      if (!resp.ok) continue;
      const text = await resp.text();
      if (!text.includes('BEGIN:VCALENDAR')) continue;
      return parseICS(text);
    } catch { continue; }
  }
  return null;
}

function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastAutoSync, setLastAutoSync] = useState(null);
  const syncInProgress = useRef(false);
  const integrationsRef = useRef(state.integrations);

  // Keep the ref current without triggering effect re-runs
  useEffect(() => {
    integrationsRef.current = state.integrations;
  }, [state.integrations]);

  const autoSync = useCallback(async () => {
    if (syncInProgress.current) return;

    const connectedFeeds = Object.entries(integrationsRef.current)
      .filter(([, v]) => v.connected && v.feedUrl)
      .map(([key, v]) => ({ key, feedUrl: v.feedUrl }));

    if (connectedFeeds.length === 0) return;

    syncInProgress.current = true;
    setSyncing(true);

    for (const { key, feedUrl } of connectedFeeds) {
      try {
        const events = await fetchICSFeed(feedUrl);
        if (events && events.length > 0) {
          const tagged = events.map(e => ({ ...e, source: key }));
          dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: key });
          dispatch({ type: 'ADD_EVENTS', payload: tagged });
          dispatch({
            type: 'CONNECT_INTEGRATION',
            payload: { service: key, extra: { feedUrl } },
          });
        }
      } catch {
        // Silent fail on auto-sync
      }
    }

    setSyncing(false);
    setLastAutoSync(new Date());
    syncInProgress.current = false;
  }, [dispatch]); // Only depends on dispatch (stable)

  // Auto-sync: once on mount + every 15 minutes
  useEffect(() => {
    const initialTimeout = setTimeout(autoSync, 3000);
    const interval = setInterval(autoSync, SYNC_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [autoSync]);

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-logo">📅</span>
          <h1 className="topbar-title">StudentCal</h1>
          {syncing && <span className="sync-indicator" title="Syncing calendars...">⟳</span>}
          {!syncing && lastAutoSync && (
            <span className="sync-time" title={`Last synced ${lastAutoSync.toLocaleTimeString()}`}>
              ✓
            </span>
          )}
        </div>
        <div className="topbar-actions">
          <button
            className="topbar-btn"
            onClick={() => setShowIntegrations(true)}
            title="Integrations"
          >
            📡 <span className="topbar-btn-label">Integrations</span>
          </button>
          <button
            className="topbar-btn"
            onClick={() => {
              if (confirm('Reset onboarding? This will clear all your data.')) {
                dispatch({ type: 'RESET_ONBOARDING' });
                clearState();
              }
            }}
            title="Reset"
          >
            ⚙️ <span className="topbar-btn-label">Reset</span>
          </button>
          <div className="topbar-avatar">
            {state.onboardingData?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="dashboard-body">
        <Calendar />
      </div>

      <TipsSidebar />
      <Chatbot />

      {showIntegrations && (
        <IntegrationsPanel onClose={() => setShowIntegrations(false)} />
      )}
    </div>
  );
}

export default function App() {
  const { state } = useAppContext();

  if (!state.onboardingComplete) {
    return <Onboarding />;
  }

  return <Dashboard />;
}
