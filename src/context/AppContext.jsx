import { createContext, useContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from '../utils/storage';

const AppContext = createContext(null);

const initialState = {
  onboardingComplete: false,
  onboardingData: null,
  events: [],
  activeView: 'month',
  selectedDate: new Date().toISOString().split('T')[0],
  integrations: {
    google: { connected: false, lastSync: null, clientId: '' },
    apple: { connected: false, lastSync: null },
    canvas: { connected: false, lastSync: null, feedUrl: '' },
  },
  dismissedTips: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true, onboardingData: action.payload };
    case 'RESET_ONBOARDING':
      return { ...initialState };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'ADD_EVENTS':
      return { ...state, events: [...state.events, ...action.payload] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(e => e.id !== action.payload) };
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };
    case 'CONNECT_INTEGRATION':
      return {
        ...state,
        integrations: {
          ...state.integrations,
          [action.payload.service]: {
            ...state.integrations[action.payload.service],
            connected: true,
            lastSync: new Date().toISOString(),
            ...(action.payload.extra || {})
          }
        }
      };
    case 'DISCONNECT_INTEGRATION': {
      const svc = action.payload;
      const prev = state.integrations[svc] || {};
      return {
        ...state,
        integrations: {
          ...state.integrations,
          [svc]: { ...prev, connected: false, lastSync: null }
        },
        events: state.events.filter(e => e.source !== svc),
      };
    }
    case 'REMOVE_EVENTS_BY_SOURCE':
      return { ...state, events: state.events.filter(e => e.source !== action.payload) };
    case 'SET_INTEGRATION_CONFIG':
      return {
        ...state,
        integrations: {
          ...state.integrations,
          [action.payload.service]: {
            ...state.integrations[action.payload.service],
            ...action.payload.config,
          }
        }
      };
    case 'DISMISS_TIP':
      return { ...state, dismissedTips: [...state.dismissedTips, action.payload] };
    case 'LOAD_STATE':
      return { ...action.payload, selectedDate: new Date().toISOString().split('T')[0] };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', payload: { ...initialState, ...saved } });
    }
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (state.onboardingComplete) {
      const toSave = { ...state };
      delete toSave.selectedDate; // Don't persist selected date
      saveState(toSave);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
