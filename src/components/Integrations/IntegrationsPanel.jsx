import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateId, addDays } from '../../utils/dateUtils';
import './IntegrationsPanel.css';

const SAMPLE_GOOGLE_EVENTS = [
  { title: 'Team Standup', category: 'work', startTime: '10:00', endTime: '10:30' },
  { title: 'Office Hours', category: 'class', startTime: '14:00', endTime: '15:00' },
  { title: 'Study Group', category: 'study', startTime: '16:00', endTime: '17:30' },
];

const SAMPLE_APPLE_EVENTS = [
  { title: 'Dentist Appointment', category: 'personal', startTime: '11:00', endTime: '12:00' },
  { title: 'Grocery Shopping', category: 'personal', startTime: '17:00', endTime: '18:00' },
];

const SAMPLE_CANVAS_EVENTS = [
  { title: 'CS 301 — Midterm Exam', category: 'class', startTime: '09:00', endTime: '10:30' },
  { title: 'MATH 200 — HW Due', category: 'study', startTime: '23:59', endTime: '23:59' },
  { title: 'ENG 102 — Essay Draft Due', category: 'study', startTime: '17:00', endTime: '17:00' },
];

export default function IntegrationsPanel({ onClose }) {
  const { state, dispatch } = useAppContext();
  const { integrations } = state;
  const [canvasToken, setCanvasToken] = useState('');
  const [syncing, setSyncing] = useState(null);

  function simulateSync(service, sampleEvents) {
    setSyncing(service);
    setTimeout(() => {
      const today = new Date();
      const events = sampleEvents.map((e, i) => ({
        ...e,
        id: generateId(),
        date: addDays(today, i + 1).toISOString().split('T')[0],
        color: `var(--cat-${e.category})`,
        source: service,
      }));
      dispatch({ type: 'ADD_EVENTS', payload: events });
      dispatch({ type: 'CONNECT_INTEGRATION', payload: { service } });
      setSyncing(null);
    }, 1500);
  }

  function disconnect(service) {
    dispatch({ type: 'DISCONNECT_INTEGRATION', payload: service });
  }

  return (
    <div className="integrations-modal" onClick={onClose}>
      <div className="integrations-card glass-card" onClick={e => e.stopPropagation()}>
        <div className="integrations-header">
          <h2>📡 Calendar Integrations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Google Calendar */}
        <div className="integration-item">
          <div className="integration-logo google">📅</div>
          <div className="integration-info">
            <div className="integration-name">Google Calendar</div>
            <div className={`integration-status ${integrations.google.connected ? 'connected' : ''}`}>
              {integrations.google.connected
                ? `✓ Connected · Last synced ${new Date(integrations.google.lastSync).toLocaleTimeString()}`
                : 'Not connected'}
            </div>
          </div>
          {integrations.google.connected ? (
            <button className="connect-btn disconnect" onClick={() => disconnect('google')}>Disconnect</button>
          ) : (
            <button
              className="connect-btn connect"
              onClick={() => simulateSync('google', SAMPLE_GOOGLE_EVENTS)}
              disabled={syncing === 'google'}
            >
              {syncing === 'google' ? '⏳ Syncing...' : 'Connect'}
            </button>
          )}
        </div>

        {/* Apple Calendar */}
        <div className="integration-item">
          <div className="integration-logo apple">🍎</div>
          <div className="integration-info">
            <div className="integration-name">Apple Calendar</div>
            <div className={`integration-status ${integrations.apple.connected ? 'connected' : ''}`}>
              {integrations.apple.connected
                ? `✓ Connected · Last synced ${new Date(integrations.apple.lastSync).toLocaleTimeString()}`
                : 'Not connected'}
            </div>
          </div>
          {integrations.apple.connected ? (
            <button className="connect-btn disconnect" onClick={() => disconnect('apple')}>Disconnect</button>
          ) : (
            <button
              className="connect-btn connect"
              onClick={() => simulateSync('apple', SAMPLE_APPLE_EVENTS)}
              disabled={syncing === 'apple'}
            >
              {syncing === 'apple' ? '⏳ Syncing...' : 'Connect'}
            </button>
          )}
        </div>

        {/* Canvas LMS */}
        <div className="integration-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div className="integration-logo canvas">🎓</div>
            <div className="integration-info">
              <div className="integration-name">Canvas LMS</div>
              <div className={`integration-status ${integrations.canvas.connected ? 'connected' : ''}`}>
                {integrations.canvas.connected
                  ? `✓ Connected · Last synced ${new Date(integrations.canvas.lastSync).toLocaleTimeString()}`
                  : 'Connect with API token'}
              </div>
            </div>
            {integrations.canvas.connected ? (
              <button className="connect-btn disconnect" onClick={() => disconnect('canvas')}>Disconnect</button>
            ) : (
              <button
                className="connect-btn connect"
                onClick={() => simulateSync('canvas', SAMPLE_CANVAS_EVENTS)}
                disabled={syncing === 'canvas' || (!canvasToken && !integrations.canvas.connected)}
              >
                {syncing === 'canvas' ? '⏳ Syncing...' : 'Sync'}
              </button>
            )}
          </div>
          {!integrations.canvas.connected && (
            <div className="canvas-token-input">
              <input
                type="text"
                placeholder="Paste your Canvas API token..."
                value={canvasToken}
                onChange={e => setCanvasToken(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="sync-info">
          <p>
            <strong>ℹ️ Note:</strong> This is a simulated integration. Clicking "Connect" will add sample events to
            demonstrate the sync flow. For production use, real OAuth and API integrations would be configured here.
          </p>
        </div>
      </div>
    </div>
  );
}
