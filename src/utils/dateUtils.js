export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function getWeekDates(date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(start.getDate() - day);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    week.push(d);
  }
  return week;
}

export function formatTime(hour, minute = 0) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export function formatDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDate(date) {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

export function getEventsForDate(events, date) {
  return events.filter(e => {
    const eDate = new Date(e.date);
    return isSameDay(eDate, date);
  });
}

export function getEventsForWeek(events, weekDates) {
  return events.filter(e => {
    const eDate = new Date(e.date);
    return weekDates.some(d => isSameDay(eDate, d));
  });
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getHourFromTime(timeStr) {
  if (!timeStr) return 0;
  const [h] = timeStr.split(':').map(Number);
  return h;
}
