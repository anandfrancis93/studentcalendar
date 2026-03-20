import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateId } from '../../utils/dateUtils';
import './Calendar.css';

const CATEGORIES = [
  { value: 'class', label: 'Class' },
  { value: 'study', label: 'Study' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'social', label: 'Social' },
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export default function EventModal({ event, date, onClose }) {
  const { dispatch } = useAppContext();
  const isEdit = !!event;

  const [form, setForm] = useState({
    title: event?.title || '',
    date: event?.date || date || new Date().toISOString().split('T')[0],
    startTime: event?.startTime || '09:00',
    endTime: event?.endTime || '10:00',
    category: event?.category || 'other',
    notes: event?.notes || '',
  });

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const eventData = {
      ...form,
      id: event?.id || generateId(),
      color: `var(--cat-${form.category})`,
      source: event?.source || 'manual',
    };
    dispatch({ type: isEdit ? 'UPDATE_EVENT' : 'ADD_EVENT', payload: eventData });
    onClose();
  }

  function handleDelete() {
    if (event) {
      dispatch({ type: 'DELETE_EVENT', payload: event.id });
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={e => update('date', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input
              className="form-input"
              type="time"
              value={form.startTime}
              onChange={e => update('startTime', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input
              className="form-input"
              type="time"
              value={form.endTime}
              onChange={e => update('endTime', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="category-select">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                className={`cat-chip cat-${c.value} ${form.category === c.value ? 'active' : ''}`}
                onClick={() => update('category', c.value)}
              >{c.label}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-input"
            rows="3"
            placeholder="Optional notes..."
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="modal-actions">
          {isEdit && (
            <button className="btn-danger" onClick={handleDelete}>🗑 Delete</button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
            {isEdit ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
