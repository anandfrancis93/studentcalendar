import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateTips } from '../../utils/tipsEngine';
import './TipsSidebar.css';

export default function TipsSidebar() {
  const { state, dispatch } = useAppContext();
  const { events, onboardingData, dismissedTips } = state;
  const [tips, setTips] = useState([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  function refreshTips() {
    const generated = generateTips(events, onboardingData);
    const filtered = generated.filter((t) => !dismissedTips.includes(t.text));
    setTips(filtered);
    setIndex(0);
  }

  useEffect(() => {
    refreshTips();
    const interval = setInterval(refreshTips, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [events, onboardingData, dismissedTips]);

  function dismiss(tipText) {
    dispatch({ type: 'DISMISS_TIP', payload: tipText });
    // Move to next tip (or wrap)
    if (tips.length <= 1) return;
    if (index >= tips.length - 1) setIndex(0);
  }

  const tip = tips[index] || null;

  return (
    <>
      <button
        className={`tips-fab ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Tips & Suggestions"
      >
        {open ? '✕' : '💡'}
        {!open && tips.length > 0 && <span className="tips-badge">{tips.length}</span>}
      </button>

      {open && (
        <div className="tips-panel glass-card">
          <div className="tips-header">
            <h3>💡 Tips & Suggestions</h3>
            {tips.length > 0 && (
              <span className="tips-counter">{index + 1} / {tips.length}</span>
            )}
          </div>

          <div className="tips-body">
            {tip ? (
              <div className="tip-card" key={index}>
                <div className="tip-content">
                  <span className="tip-icon">{tip.icon}</span>
                  <span className="tip-text">{tip.text}</span>
                </div>
                <button
                  className="tip-dismiss"
                  onClick={() => dismiss(tip.text)}
                  title="Dismiss this tip"
                >✕</button>
              </div>
            ) : (
              <div className="tip-card tip-empty">
                <div className="tip-content">
                  <span className="tip-icon">✨</span>
                  <span className="tip-text">All caught up! Check back later for new suggestions.</span>
                </div>
              </div>
            )}
          </div>

          {tips.length > 1 && (
            <div className="tips-nav">
              <button
                className="tips-arrow"
                onClick={() => setIndex(i => (i - 1 + tips.length) % tips.length)}
              >
                ← Prev
              </button>
              <button
                className="tips-arrow"
                onClick={() => setIndex(i => (i + 1) % tips.length)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
