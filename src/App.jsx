import { useState } from 'react';
import { useAppContext } from './context/AppContext';
import { clearState } from './utils/storage';
import Onboarding from './components/Onboarding/Onboarding';
import Calendar from './components/Calendar/Calendar';
import TipsSidebar from './components/Tips/TipsSidebar';
import Chatbot from './components/Chatbot/Chatbot';
import IntegrationsPanel from './components/Integrations/IntegrationsPanel';
import './App.css';

function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [showIntegrations, setShowIntegrations] = useState(false);

  return (
    <div className="dashboard">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-logo">📅</span>
          <h1 className="topbar-title">StudentCal</h1>
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
        <TipsSidebar />
      </div>

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
