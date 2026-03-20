import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateTips } from '../../utils/tipsEngine';
import './TipsSidebar.css';

export default function TipsSidebar() {
  const { state, dispatch } = useAppContext();
  const { events, onboardingData, dismissedTips } = state;
  const [tips, setTips] = useState([]);
  const [open, setOpen] = useState(false);

  function refreshTips() {
    const generated = generateTips(events, onboardingData);
    const filtered = generated.filter((t) => !dismissedTips.includes(t.text));
    setTips(filtered);
  }

  useEffect(() => {
    refreshTips();
    const interval = setInterval(refreshTips, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [events, onboardingData, dismissedTips]);

  function dismiss(tipText) {
    dispatch({ type: 'DISMISS_TIP', payload: tipText });
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`tips-fab ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Tips & Suggestions"
      >
        {open ? '✕' : '💡'}
        {!open && tips.length > 0 && <span className="tips-badge">{tips.length}</span>}
      </button>

      {/* Popup Panel */}
      {open && (
        <div className="tips-panel glass-card">
          <div className="tips-header">
            <h3>💡 Tips & Suggestions</h3>
            <button className="tips-refresh-btn" onClick={refreshTips} title="Refresh">
              🔄
            </button>
          </div>

          <div className="tips-scroll">
            {tips.slice(0, 10).map((tip, i) => (
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
              <div className="tip-card tip-empty">
                <div className="tip-content">
                  <span className="tip-icon">✨</span>
                  <span className="tip-text">All caught up! Check back later for new suggestions.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
