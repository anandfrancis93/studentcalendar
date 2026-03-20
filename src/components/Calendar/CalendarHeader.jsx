import { useAppContext } from '../../context/AppContext';
import { MONTHS } from '../../utils/dateUtils';
import './Calendar.css';

export default function CalendarHeader() {
  const { state, dispatch } = useAppContext();
  const { activeView, selectedDate } = state;
  const date = new Date(selectedDate + 'T00:00:00');

  function navigate(direction) {
    const d = new Date(date);
    if (activeView === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else if (activeView === 'week') {
      d.setDate(d.getDate() + (direction * 7));
    } else {
      d.setDate(d.getDate() + direction);
    }
    dispatch({ type: 'SET_DATE', payload: d.toISOString().split('T')[0] });
  }

  function goToday() {
    dispatch({ type: 'SET_DATE', payload: new Date().toISOString().split('T')[0] });
  }

  function setView(view) {
    dispatch({ type: 'SET_VIEW', payload: view });
  }

  let titleText = '';
  if (activeView === 'month') {
    titleText = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  } else if (activeView === 'week') {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    titleText = `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
  } else {
    titleText = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  return (
    <div className="calendar-header">
      <div className="calendar-nav">
        <button className="nav-btn" onClick={() => navigate(-1)}>‹</button>
        <button className="today-btn" onClick={goToday}>Today</button>
        <button className="nav-btn" onClick={() => navigate(1)}>›</button>
      </div>

      <h2 className="calendar-title">{titleText}</h2>

      <div className="view-switcher">
        {['month', 'week', 'day'].map(v => (
          <button
            key={v}
            className={`view-btn ${activeView === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
