import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { parseICS, generateICS } from '../../utils/icsParser';
import './IntegrationsPanel.css';

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const SERVICES = [
  {
    key: 'google',
    name: 'Google Calendar',
    icon: '📅',
    logoClass: 'google',
    placeholder: 'https://calendar.google.com/calendar/ical/your-email/basic.ics',
    help: (
      <>
        Google Calendar → Settings → Your calendar → "Secret address in iCal format".{' '}
        <a href="https://support.google.com/calendar/answer/37648#zippy=%2Cget-your-calendar-view-only" target="_blank" rel="noopener noreferrer">
          How to find it
        </a>
      </>
    ),
  },
  {
    key: 'canvas',
    name: 'Canvas LMS',
    icon: '🎓',
    logoClass: 'canvas',
    placeholder: 'https://school.instructure.com/feeds/calendars/user_xxxx.ics',
    help: 'Canvas → Calendar → click "Calendar Feed" link at the bottom of the page.',
  },
  {
    key: 'apple',
    name: 'Apple Calendar',
    icon: '🍎',
    logoClass: 'apple',
    placeholder: 'https://p##-caldav.icloud.com/published/2/xxxx',
    help: (
      <>
        iCloud Calendar → Share calendar → Public Calendar → copy the URL.
        Or import/export <code>.ics</code> files below.
      </>
    ),
  },
];

async function fetchICSFeed(feedUrl) {
  let icsText = null;
  let lastError = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(feedUrl), {
        headers: { Accept: 'text/calendar, text/plain, */*' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      icsText = await resp.text();
      if (!icsText.includes('BEGIN:VCALENDAR')) throw new Error('Not a valid iCal feed');
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!icsText) {
    throw new Error(`Could not fetch feed. ${lastError?.message || ''} — double-check the URL.`);
  }

  return parseICS(icsText);
}

export default function IntegrationsPanel({ onClose }) {
  const { state, dispatch } = useAppContext();
  const { integrations, events } = state;

  const [feedUrls, setFeedUrls] = useState({
    google: integrations.google.feedUrl || '',
    canvas: integrations.canvas.feedUrl || '',
    apple: integrations.apple.feedUrl || '',
  });
  const [syncing, setSyncing] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setError(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  function showError(msg) {
    setError(msg);
    setSuccessMsg(null);
  }

  async function syncFeed(serviceKey) {
    const url = feedUrls[serviceKey]?.trim();
    if (!url) {
      showError('Please paste a calendar feed URL first.');
      return;
    }

    setSyncing(serviceKey);
    setError(null);

    try {
      const parsed = await fetchICSFeed(url);
      const tagged = parsed.map(e => ({ ...e, source: serviceKey }));

      dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: serviceKey });
      dispatch({ type: 'ADD_EVENTS', payload: tagged });
      dispatch({
        type: 'CONNECT_INTEGRATION',
        payload: { service: serviceKey, extra: { feedUrl: url } },
      });
      dispatch({
        type: 'SET_INTEGRATION_CONFIG',
        payload: { service: serviceKey, config: { feedUrl: url } },
      });

      showSuccess(`✅ Synced ${tagged.length} events from ${SERVICES.find(s => s.key === serviceKey)?.name}!`);
    } catch (err) {
      showError(err.message);
    } finally {
      setSyncing(null);
    }
  }

  function disconnect(serviceKey) {
    dispatch({ type: 'DISCONNECT_INTEGRATION', payload: serviceKey });
    setFeedUrls(prev => ({ ...prev, [serviceKey]: '' }));
    showSuccess(`${SERVICES.find(s => s.key === serviceKey)?.name} disconnected.`);
  }

  // Apple ICS file import
  function handleICSImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing('apple-file');
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = parseICS(ev.target.result);
        if (imported.length === 0) {
          showError('No events found in this file.');
          setSyncing(null);
          return;
        }
        const tagged = imported.map(evt => ({ ...evt, source: 'apple' }));
        dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: 'apple' });
        dispatch({ type: 'ADD_EVENTS', payload: tagged });
        dispatch({ type: 'CONNECT_INTEGRATION', payload: { service: 'apple' } });
        showSuccess(`✅ Imported ${tagged.length} events from ICS file!`);
      } catch (err) {
        showError(`Import error: ${err.message}`);
      } finally {
        setSyncing(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function exportICS() {
    const blob = new Blob([generateICS(events)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studentcal-events.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('📥 Exported all events as ICS file!');
  }

  return (
    <div className="integrations-modal" onClick={onClose}>
      <div className="integrations-card glass-card" onClick={e => e.stopPropagation()}>
        <div className="integrations-header">
          <h2>📡 Calendar Integrations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="integration-alert error">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        {successMsg && (
          <div className="integration-alert success">
            <span>✓</span>
            <p>{successMsg}</p>
          </div>
        )}

        {SERVICES.map(svc => {
          const intg = integrations[svc.key] || {};
          return (
            <div className="integration-item-full" key={svc.key}>
              <div className="integration-item-row">
                <div className={`integration-logo ${svc.logoClass}`}>{svc.icon}</div>
                <div className="integration-info">
                  <div className="integration-name">{svc.name}</div>
                  <div className={`integration-status ${intg.connected ? 'connected' : ''}`}>
                    {intg.connected
                      ? `✓ Connected · Last synced ${new Date(intg.lastSync).toLocaleString()}`
                      : 'Paste iCal feed URL to sync'}
                  </div>
                </div>
              </div>

              <div className="integration-config">
                {!intg.connected ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">iCal Feed URL</label>
                      <input
                        className="form-input config-input"
                        type="url"
                        placeholder={svc.placeholder}
                        value={feedUrls[svc.key]}
                        onChange={e => setFeedUrls(prev => ({ ...prev, [svc.key]: e.target.value }))}
                      />
                      <span className="config-help">{svc.help}</span>
                    </div>
                    <button
                      className="connect-btn connect"
                      onClick={() => syncFeed(svc.key)}
                      disabled={syncing === svc.key || !feedUrls[svc.key]?.trim()}
                    >
                      {syncing === svc.key ? '⏳ Syncing...' : '🔗 Sync'}
                    </button>
                  </>
                ) : (
                  <div className="connected-actions">
                    <button
                      className="connect-btn connect"
                      onClick={() => syncFeed(svc.key)}
                      disabled={syncing === svc.key}
                    >
                      {syncing === svc.key ? '⏳ Syncing...' : '🔄 Re-sync'}
                    </button>
                    <button className="connect-btn disconnect" onClick={() => disconnect(svc.key)}>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ICS File Import/Export */}
        <div className="integration-item-full">
          <div className="integration-item-row">
            <div className="integration-logo file-logo">📄</div>
            <div className="integration-info">
              <div className="integration-name">ICS File Import / Export</div>
              <div className="integration-status">
                Works with any calendar app
              </div>
            </div>
          </div>
          <div className="integration-config">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,.ical,.ifb,.icalendar"
              style={{ display: 'none' }}
              onChange={handleICSImport}
            />
            <div className="connected-actions">
              <button
                className="connect-btn connect"
                onClick={() => fileInputRef.current?.click()}
                disabled={syncing === 'apple-file'}
              >
                {syncing === 'apple-file' ? '⏳ Importing...' : '📂 Import .ics'}
              </button>
              <button className="connect-btn export-btn" onClick={exportICS}>
                📥 Export All Events
              </button>
            </div>
          </div>
        </div>

        <div className="sync-info">
          <p>
            <strong>🔒 Privacy:</strong> All data stays in your browser. Feed URLs are fetched through a CORS proxy
            but no data is stored on any server.
          </p>
        </div>
      </div>
    </div>
  );
}
