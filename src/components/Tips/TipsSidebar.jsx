import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateTips } from '../../utils/tipsEngine';
import './TipsSidebar.css';

export default function TipsSidebar() {
  const { state, dispatch } = useAppContext();
  const { events, onboardingData, dismissedTips } = state;
  const [tips, setTips] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  function refreshTips() {
    const generated = generateTips(events, onboardingData);
    const filtered = generated.filter((t, i) => !dismissedTips.includes(t.text));
    setTips(filtered);
  }

  useEffect(() => {
    refreshTips();
    // Refresh tips every 5 minutes
    const interval = setInterval(refreshTips, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [events, onboardingData, dismissedTips]);

  function dismiss(tipText) {
    dispatch({ type: 'DISMISS_TIP', payload: tipText });
  }

  return (
    <aside className={`tips-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="tips-header">
        <h3>
          💡 <span>Tips & Suggestions</span>
        </h3>
        <button className="tips-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="tips-list">
            {tips.slice(0, 8).map((tip, i) => (
              <div className="tip-card" key={i}>
                <div className="tip-content">
                  <span className="tip-icon">{tip.icon}</span>
                  <span className="tip-text">{tip.text}</span>
                </div>
                <button
                  className="tip-dismiss"
                  onClick={() => dismiss(tip.text)}
                  title="Dismiss"
                >✕</button>
              </div>
            ))}
            {tips.length === 0 && (
              <div className="tip-card">
                <div className="tip-content">
                  <span className="tip-icon">✨</span>
                  <span className="tip-text">All caught up! Check back later for new suggestions.</span>
                </div>
              </div>
            )}
          </div>
          <button className="tips-refresh" onClick={refreshTips}>
            🔄 Refresh Tips
          </button>
        </>
      )}
    </aside>
  );
}
