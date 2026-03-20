import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  getDaysInMonth, getFirstDayOfMonth, isSameDay, isToday,
  getWeekDates, getEventsForDate, DAYS, DAYS_FULL, MONTHS,
  formatTime
} from '../../utils/dateUtils';
import CalendarHeader from './CalendarHeader';
import EventModal from './EventModal';
import './Calendar.css';

export default function Calendar() {
  const { state, dispatch } = useAppContext();
  const { activeView, selectedDate, events } = state;
  const currentDate = new Date(selectedDate + 'T00:00:00');

  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [modalDate, setModalDate] = useState(null);

  function openAddModal(date) {
    setEditEvent(null);
    setModalDate(date);
    setModalOpen(true);
  }

  function openEditModal(evt) {
    setEditEvent(evt);
    setModalDate(null);
    setModalOpen(true);
  }

  function handleDayClick(date) {
    dispatch({ type: 'SET_DATE', payload: date.toISOString().split('T')[0] });
    if (activeView === 'month') {
      dispatch({ type: 'SET_VIEW', payload: 'day' });
    }
  }

  // ─── Month View ────────────────────────────
  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const cells = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date: d, otherMonth: true });
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), otherMonth: false });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(year, month + 1, i), otherMonth: true });
    }

    return (
      <div className="month-grid">
        {DAYS.map(d => <div key={d} className="month-day-header">{d}</div>)}
        {cells.map((cell, i) => {
          const dayEvents = getEventsForDate(events, cell.date);
          const today = isToday(cell.date);
          const selected = isSameDay(cell.date, currentDate);
          return (
            <div
              key={i}
              className={`month-day ${cell.otherMonth ? 'other-month' : ''} ${today ? 'today' : ''} ${selected ? 'selected' : ''}`}
              onClick={() => handleDayClick(cell.date)}
            >
              <div className="day-number">{cell.date.getDate()}</div>
              <div className="event-dot-row">
                {dayEvents.slice(0, 3).map(e => (
                  <div
                    key={e.id}
                    className={`event-chip cat-${e.category || 'other'}`}
                    onClick={ev => { ev.stopPropagation(); openEditModal(e); }}
                    title={e.title}
                  >{e.title}</div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="more-events">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Week View ─────────────────────────────
  function renderWeekView() {
    const weekDates = getWeekDates(currentDate);
    const hours = [];
    for (let h = 6; h <= 22; h++) hours.push(h);

    return (
      <div className="week-grid">
        {/* Corner */}
        <div className="week-day-header" />
        {/* Day headers */}
        {weekDates.map((d, i) => (
          <div key={i} className={`week-day-header ${isToday(d) ? 'today-col' : ''}`}>
            <div className="week-day-name">{DAYS[i]}</div>
            <div className="week-day-number">{d.getDate()}</div>
          </div>
        ))}
        {/* Time rows */}
        {hours.map(h => (
          <>
            <div key={`t${h}`} className="week-time-label">{formatTime(h)}</div>
            {weekDates.map((d, di) => {
              const dayEvents = getEventsForDate(events, d);
              const hourEvents = dayEvents.filter(e => {
                const startH = parseInt(e.startTime?.split(':')[0] || 0);
                return startH === h;
              });
              return (
                <div
                  key={`${h}-${di}`}
                  className="week-cell"
                  onClick={() => openAddModal(d.toISOString().split('T')[0])}
                >
                  {hourEvents.map(e => {
                    const startH = parseInt(e.startTime?.split(':')[0] || 0);
                    const endH = parseInt(e.endTime?.split(':')[0] || startH + 1);
                    const span = Math.max(endH - startH, 1);
                    return (
                      <div
                        key={e.id}
                        className="week-event"
                        style={{
                          background: `var(--cat-${e.category || 'other'})`,
                          height: `${span * 60 - 4}px`,
                        }}
                        onClick={ev => { ev.stopPropagation(); openEditModal(e); }}
                      >{e.title}</div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    );
  }

  // ─── Day View ──────────────────────────────
  function renderDayView() {
    const dayEvents = getEventsForDate(events, currentDate);
    const hours = [];
    for (let h = 6; h <= 22; h++) hours.push(h);

    return (
      <div className="day-view">
        <div className="day-view-header">
          <div className="day-view-date">
            {DAYS_FULL[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
          </div>
          <div className="day-view-subtitle">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
            {isToday(currentDate) ? ' · Today' : ''}
          </div>
        </div>
        <div className="day-timeline">
          {hours.map(h => {
            const hourEvents = dayEvents.filter(e => {
              const startH = parseInt(e.startTime?.split(':')[0] || 0);
              return startH === h;
            });
            return (
              <>
                <div key={`dt${h}`} className="day-time-label">{formatTime(h)}</div>
                <div
                  key={`ds${h}`}
                  className="day-slot"
                  onClick={() => openAddModal(currentDate.toISOString().split('T')[0])}
                >
                  {hourEvents.map(e => {
                    const startH = parseInt(e.startTime?.split(':')[0] || 0);
                    const endH = parseInt(e.endTime?.split(':')[0] || startH + 1);
                    const span = Math.max(endH - startH, 1);
                    return (
                      <div
                        key={e.id}
                        className="day-event"
                        style={{
                          background: `var(--cat-${e.category || 'other'})`,
                          height: `${span * 60 - 8}px`,
                        }}
                        onClick={ev => { ev.stopPropagation(); openEditModal(e); }}
                      >
                        <span>{e.title}</span>
                        <span className="day-event-time">
                          {formatTime(...e.startTime.split(':').map(Number))} – {formatTime(...e.endTime.split(':').map(Number))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-wrapper">
      <CalendarHeader />
      {activeView === 'month' && renderMonthView()}
      {activeView === 'week' && renderWeekView()}
      {activeView === 'day' && renderDayView()}

      <button
        className="add-event-fab"
        onClick={() => openAddModal(selectedDate)}
        title="Add Event"
      >+</button>

      {modalOpen && (
        <EventModal
          event={editEvent}
          date={modalDate || selectedDate}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
