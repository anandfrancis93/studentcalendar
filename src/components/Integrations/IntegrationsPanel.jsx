import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { initGoogleAuth, signInGoogle, signOutGoogle, fetchGoogleEvents } from '../../utils/googleCalendar';
import { fetchCanvasEvents, isValidCanvasFeedUrl } from '../../utils/canvasCalendar';
import { parseICS, generateICS } from '../../utils/icsParser';
import './IntegrationsPanel.css';

export default function IntegrationsPanel({ onClose }) {
  const { state, dispatch } = useAppContext();
  const { integrations, events } = state;

  const [googleClientId, setGoogleClientId] = useState(integrations.google.clientId || '');
  const [canvasFeedUrl, setCanvasFeedUrl] = useState(integrations.canvas.feedUrl || '');
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

  // ─── Google Calendar ──────────────────────────
  async function connectGoogle() {
    if (!googleClientId.trim()) {
      showError('Please enter your Google OAuth Client ID first.');
      return;
    }

    setSyncing('google');
    setError(null);

    try {
      // Save client ID
      dispatch({
        type: 'SET_INTEGRATION_CONFIG',
        payload: { service: 'google', config: { clientId: googleClientId.trim() } }
      });

      // Initialize Google Auth
      await initGoogleAuth(googleClientId.trim());

      // Trigger OAuth popup
      const token = await signInGoogle();

      // Fetch real events
      const googleEvents = await fetchGoogleEvents(token);

      // Remove old Google events and add new ones
      dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: 'google' });
      dispatch({ type: 'ADD_EVENTS', payload: googleEvents });
      dispatch({
        type: 'CONNECT_INTEGRATION',
        payload: { service: 'google', extra: { clientId: googleClientId.trim() } }
      });

      showSuccess(`✅ Synced ${googleEvents.length} events from Google Calendar!`);
    } catch (err) {
      showError(`Google Calendar error: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }

  function disconnectGoogle() {
    signOutGoogle();
    dispatch({ type: 'DISCONNECT_INTEGRATION', payload: 'google' });
    showSuccess('Google Calendar disconnected.');
  }

  // ─── Canvas LMS ───────────────────────────────
  async function syncCanvas() {
    if (!canvasFeedUrl.trim()) {
      showError('Please enter your Canvas calendar feed URL.');
      return;
    }

    if (!isValidCanvasFeedUrl(canvasFeedUrl.trim())) {
      showError('This doesn\'t look like a valid Canvas feed URL. It should end in .ics or come from your Canvas calendar settings.');
      return;
    }

    setSyncing('canvas');
    setError(null);

    try {
      // Save feed URL
      dispatch({
        type: 'SET_INTEGRATION_CONFIG',
        payload: { service: 'canvas', config: { feedUrl: canvasFeedUrl.trim() } }
      });

      // Fetch real events from Canvas feed
      const canvasEvents = await fetchCanvasEvents(canvasFeedUrl.trim());

      // Remove old Canvas events and add new ones
      dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: 'canvas' });
      dispatch({ type: 'ADD_EVENTS', payload: canvasEvents });
      dispatch({
        type: 'CONNECT_INTEGRATION',
        payload: { service: 'canvas', extra: { feedUrl: canvasFeedUrl.trim() } }
      });

      showSuccess(`✅ Synced ${canvasEvents.length} events from Canvas LMS!`);
    } catch (err) {
      showError(`Canvas sync error: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  }

  function disconnectCanvas() {
    dispatch({ type: 'DISCONNECT_INTEGRATION', payload: 'canvas' });
    setCanvasFeedUrl('');
    showSuccess('Canvas LMS disconnected.');
  }

  // ─── Apple Calendar (ICS Import/Export) ────────
  function handleICSImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing('apple');
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const icsText = ev.target.result;
        const importedEvents = parseICS(icsText);

        if (importedEvents.length === 0) {
          showError('No events found in this ICS file. Make sure it\'s a valid calendar export.');
          setSyncing(null);
          return;
        }

        // Tag as apple source
        const appleEvents = importedEvents.map(evt => ({ ...evt, source: 'apple' }));

        dispatch({ type: 'REMOVE_EVENTS_BY_SOURCE', payload: 'apple' });
        dispatch({ type: 'ADD_EVENTS', payload: appleEvents });
        dispatch({ type: 'CONNECT_INTEGRATION', payload: { service: 'apple' } });

        showSuccess(`✅ Imported ${appleEvents.length} events from ICS file!`);
      } catch (err) {
        showError(`ICS import error: ${err.message}`);
      } finally {
        setSyncing(null);
      }
    };
    reader.onerror = () => {
      showError('Failed to read the file.');
      setSyncing(null);
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported
    e.target.value = '';
  }

  function exportICS() {
    const icsContent = generateICS(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
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

  function disconnectApple() {
    dispatch({ type: 'DISCONNECT_INTEGRATION', payload: 'apple' });
    showSuccess('Apple Calendar events removed.');
  }

  return (
    <div className="integrations-modal" onClick={onClose}>
      <div className="integrations-card glass-card" onClick={e => e.stopPropagation()}>
        <div className="integrations-header">
          <h2>📡 Calendar Integrations</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Status Messages */}
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

        {/* ── Google Calendar ──────────────────── */}
        <div className="integration-item-full">
          <div className="integration-item-row">
            <div className="integration-logo google">📅</div>
            <div className="integration-info">
              <div className="integration-name">Google Calendar</div>
              <div className={`integration-status ${integrations.google.connected ? 'connected' : ''}`}>
                {integrations.google.connected
                  ? `✓ Connected · Last synced ${new Date(integrations.google.lastSync).toLocaleString()}`
                  : 'Connect with OAuth'}
              </div>
            </div>
          </div>

          {!integrations.google.connected ? (
            <div className="integration-config">
              <div className="form-group">
                <label className="form-label">Google OAuth Client ID</label>
                <input
                  className="form-input config-input"
                  type="text"
                  placeholder="xxxx.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={e => setGoogleClientId(e.target.value)}
                />
                <span className="config-help">
                  Get this from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> → Credentials → OAuth 2.0 Client ID
                </span>
              </div>
              <button
                className="connect-btn connect"
                onClick={connectGoogle}
                disabled={syncing === 'google' || !googleClientId.trim()}
              >
                {syncing === 'google' ? '⏳ Connecting...' : '🔗 Connect with Google'}
              </button>
            </div>
          ) : (
            <div className="integration-config">
              <div className="connected-actions">
                <button
                  className="connect-btn connect"
                  onClick={connectGoogle}
                  disabled={syncing === 'google'}
                >
                  {syncing === 'google' ? '⏳ Syncing...' : '🔄 Re-sync'}
                </button>
                <button className="connect-btn disconnect" onClick={disconnectGoogle}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Canvas LMS ───────────────────────── */}
        <div className="integration-item-full">
          <div className="integration-item-row">
            <div className="integration-logo canvas">🎓</div>
            <div className="integration-info">
              <div className="integration-name">Canvas LMS</div>
              <div className={`integration-status ${integrations.canvas.connected ? 'connected' : ''}`}>
                {integrations.canvas.connected
                  ? `✓ Connected · Last synced ${new Date(integrations.canvas.lastSync).toLocaleString()}`
                  : 'Connect with Calendar Feed URL'}
              </div>
            </div>
          </div>

          {!integrations.canvas.connected ? (
            <div className="integration-config">
              <div className="form-group">
                <label className="form-label">Canvas Calendar Feed URL</label>
                <input
                  className="form-input config-input"
                  type="url"
                  placeholder="https://school.instructure.com/feeds/calendars/user_xxxx.ics"
                  value={canvasFeedUrl}
                  onChange={e => setCanvasFeedUrl(e.target.value)}
                />
                <span className="config-help">
                  Find this in Canvas → Calendar → "Calendar Feed" link at the bottom of the page
                </span>
              </div>
              <button
                className="connect-btn connect"
                onClick={syncCanvas}
                disabled={syncing === 'canvas' || !canvasFeedUrl.trim()}
              >
                {syncing === 'canvas' ? '⏳ Syncing...' : '🔗 Sync Canvas'}
              </button>
            </div>
          ) : (
            <div className="integration-config">
              <div className="connected-actions">
                <button
                  className="connect-btn connect"
                  onClick={syncCanvas}
                  disabled={syncing === 'canvas'}
                >
                  {syncing === 'canvas' ? '⏳ Syncing...' : '🔄 Re-sync'}
                </button>
                <button className="connect-btn disconnect" onClick={disconnectCanvas}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Apple Calendar ───────────────────── */}
        <div className="integration-item-full">
          <div className="integration-item-row">
            <div className="integration-logo apple">🍎</div>
            <div className="integration-info">
              <div className="integration-name">Apple Calendar</div>
              <div className={`integration-status ${integrations.apple.connected ? 'connected' : ''}`}>
                {integrations.apple.connected
                  ? `✓ Imported · Last updated ${new Date(integrations.apple.lastSync).toLocaleString()}`
                  : 'Import / Export ICS files'}
              </div>
            </div>
          </div>

          <div className="integration-config">
            <div className="apple-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,.ical,.ifb,.icalendar"
                style={{ display: 'none' }}
                onChange={handleICSImport}
              />
              <button
                className="connect-btn connect"
                onClick={() => fileInputRef.current?.click()}
                disabled={syncing === 'apple'}
              >
                {syncing === 'apple' ? '⏳ Importing...' : '📂 Import .ics File'}
              </button>
              <button className="connect-btn export-btn" onClick={exportICS}>
                📥 Export All Events
              </button>
              {integrations.apple.connected && (
                <button className="connect-btn disconnect" onClick={disconnectApple}>
                  Remove Imported
                </button>
              )}
            </div>
            <span className="config-help">
              Export from Apple Calendar: File → Export → Export… (saves .ics file). Then import it here.
            </span>
          </div>
        </div>

        <div className="sync-info">
          <p>
            <strong>🔒 Privacy:</strong> All data stays in your browser. Google uses OAuth (no passwords stored).
            Canvas and Apple use file-based sync. Nothing is sent to any third-party server.
          </p>
        </div>
      </div>
    </div>
  );
}
