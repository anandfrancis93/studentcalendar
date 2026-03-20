import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { generateId } from '../../utils/dateUtils';
import './Onboarding.css';

const TOTAL_STEPS = 6;

const ROLE_OPTIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Grad Student'];
const STUDY_PREFS = [
  { value: 'morning', label: '🌅 Morning', desc: '6am – 12pm' },
  { value: 'afternoon', label: '☀️ Afternoon', desc: '12pm – 5pm' },
  { value: 'evening', label: '🌆 Evening', desc: '5pm – 9pm' },
  { value: 'night', label: '🌙 Night', desc: '9pm – 1am' },
];
const GOAL_OPTIONS = [
  { id: 'gpa', icon: '🎓', title: 'Academic Excellence', desc: 'Maintain or improve GPA' },
  { id: 'fitness', icon: '💪', title: 'Stay Fit', desc: 'Regular exercise and health' },
  { id: 'social', icon: '👥', title: 'Social Life', desc: 'Connect with friends and clubs' },
  { id: 'sleep', icon: '😴', title: 'Better Sleep', desc: 'Consistent sleep schedule' },
  { id: 'skills', icon: '🛠️', title: 'Build Skills', desc: 'Side projects and learning' },
  { id: 'mindfulness', icon: '🧘', title: 'Mental Wellness', desc: 'Meditation and self-care' },
];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Onboarding() {
  const { dispatch } = useAppContext();
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    wakeTime: '07:00',
    sleepTime: '23:00',
    classes: [{ name: '', days: [], startTime: '09:00', endTime: '10:00' }],
    studyPreference: '',
    extracurriculars: '',
    goals: [],
  });

  function update(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function addClass() {
    update('classes', [...formData.classes, { name: '', days: [], startTime: '09:00', endTime: '10:00' }]);
  }

  function updateClass(index, field, value) {
    const updated = [...formData.classes];
    updated[index] = { ...updated[index], [field]: value };
    update('classes', updated);
  }

  function removeClass(index) {
    if (formData.classes.length <= 1) return;
    update('classes', formData.classes.filter((_, i) => i !== index));
  }

  function toggleDay(classIndex, dayIndex) {
    const updated = [...formData.classes];
    const days = updated[classIndex].days.includes(dayIndex)
      ? updated[classIndex].days.filter(d => d !== dayIndex)
      : [...updated[classIndex].days, dayIndex];
    updated[classIndex] = { ...updated[classIndex], days };
    update('classes', updated);
  }

  function toggleGoal(goalId) {
    const goals = formData.goals.includes(goalId)
      ? formData.goals.filter(g => g !== goalId)
      : [...formData.goals, goalId];
    update('goals', goals);
  }

  function finish() {
    // Generate events from class schedule
    const events = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun

    formData.classes.forEach(cls => {
      if (!cls.name) return;
      cls.days.forEach(d => {
        // Map 0=Mon...6=Sun to JS day 1=Mon...0=Sun
        const jsDay = d === 6 ? 0 : d + 1;
        // Find next occurrence
        let diff = jsDay - dayOfWeek;
        if (diff < 0) diff += 7;

        // Create events for the next 4 weeks
        for (let w = 0; w < 4; w++) {
          const eventDate = new Date(today);
          eventDate.setDate(today.getDate() + diff + (w * 7));
          events.push({
            id: generateId(),
            title: cls.name,
            date: eventDate.toISOString().split('T')[0],
            startTime: cls.startTime,
            endTime: cls.endTime,
            category: 'class',
            color: 'var(--cat-class)',
            source: 'onboarding',
          });
        }
      });
    });

    // Add wake/sleep routine events for next 7 days
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];

      events.push({
        id: generateId(),
        title: '🌅 Wake Up',
        date: dateStr,
        startTime: formData.wakeTime,
        endTime: formData.wakeTime,
        category: 'personal',
        color: 'var(--cat-personal)',
        source: 'onboarding',
      });
    }

    // Parse extracurriculars
    if (formData.extracurriculars.trim()) {
      const activities = formData.extracurriculars.split(',').map(a => a.trim()).filter(Boolean);
      activities.forEach((activity, i) => {
        // Add as a weekly event on varying days
        const dayOffset = (i % 5) + 1;
        for (let w = 0; w < 4; w++) {
          const date = new Date(today);
          date.setDate(today.getDate() + dayOffset + (w * 7));
          events.push({
            id: generateId(),
            title: activity,
            date: date.toISOString().split('T')[0],
            startTime: '17:00',
            endTime: '18:30',
            category: 'social',
            color: 'var(--cat-social)',
            source: 'onboarding',
          });
        }
      });
    }

    dispatch({ type: 'COMPLETE_ONBOARDING', payload: formData });
    dispatch({ type: 'ADD_EVENTS', payload: events });
  }

  const progress = ((step + 1) / (TOTAL_STEPS + 1)) * 100;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <div className="onboarding-logo">StudentCal</div>
          <p className="onboarding-subtitle">Let's set up your personalized calendar</p>
        </div>

        <div className="progress-bar-container">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{step + 1} / {TOTAL_STEPS + 1}</span>
        </div>

        {step === 0 && (
          <div className="step-card glass-card" key="step0">
            <div className="step-number">1</div>
            <h2 className="step-title">About You</h2>
            <p className="step-description">Tell us a bit about yourself so we can personalize your experience.</p>

            <div className="form-group">
              <label className="form-label">What's your name?</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., Alex"
                value={formData.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">What year are you?</label>
              <div className="chip-group">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r}
                    className={`chip ${formData.role === r ? 'active' : ''}`}
                    onClick={() => update('role', r)}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="step-actions">
              <div />
              <button className="btn-primary" onClick={next} disabled={!formData.name}>
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="step-card glass-card" key="step1">
            <div className="step-number">2</div>
            <h2 className="step-title">Daily Routine</h2>
            <p className="step-description">When do you usually wake up and go to sleep?</p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">⏰ Wake-up time</label>
                <input
                  className="form-input"
                  type="time"
                  value={formData.wakeTime}
                  onChange={e => update('wakeTime', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">🌙 Bedtime</label>
                <input
                  className="form-input"
                  type="time"
                  value={formData.sleepTime}
                  onChange={e => update('sleepTime', e.target.value)}
                />
              </div>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-card glass-card" key="step2">
            <div className="step-number">3</div>
            <h2 className="step-title">Class Schedule</h2>
            <p className="step-description">Add your classes so we can block time on your calendar.</p>

            <div className="class-entries">
              {formData.classes.map((cls, i) => (
                <div className="class-entry" key={i}>
                  <div className="class-entry-header">
                    <h4>Class {i + 1}</h4>
                    {formData.classes.length > 1 && (
                      <button className="remove-class-btn" onClick={() => removeClass(i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className="form-group">
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g., CS 101 — Intro to Programming"
                      value={cls.name}
                      onChange={e => updateClass(i, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Days</label>
                    <div className="day-toggle-group">
                      {DAY_LABELS.map((d, di) => (
                        <button
                          key={di}
                          className={`day-toggle ${cls.days.includes(di) ? 'active' : ''}`}
                          onClick={() => toggleDay(i, di)}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Start</label>
                      <input className="form-input" type="time" value={cls.startTime} onChange={e => updateClass(i, 'startTime', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End</label>
                      <input className="form-input" type="time" value={cls.endTime} onChange={e => updateClass(i, 'endTime', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="add-class-btn" onClick={addClass}>+ Add Another Class</button>

            <div className="step-actions">
              <button className="btn-secondary" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-card glass-card" key="step3">
            <div className="step-number">4</div>
            <h2 className="step-title">Study Preference</h2>
            <p className="step-description">When do you find yourself most productive?</p>

            <div className="chip-group" style={{ flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {STUDY_PREFS.map(p => (
                <button
                  key={p.value}
                  className={`goal-option ${formData.studyPreference === p.value ? 'active' : ''}`}
                  onClick={() => update('studyPreference', p.value)}
                >
                  <span className="goal-icon">{p.label.split(' ')[0]}</span>
                  <div className="goal-info">
                    <h4>{p.label}</h4>
                    <p>{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-card glass-card" key="step4">
            <div className="step-number">5</div>
            <h2 className="step-title">Extracurriculars</h2>
            <p className="step-description">What activities or commitments do you have outside classes?</p>

            <div className="form-group">
              <label className="form-label">Activities (comma-separated)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., Basketball, Chess Club, Part-time job"
                value={formData.extracurriculars}
                onChange={e => update('extracurriculars', e.target.value)}
              />
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-card glass-card" key="step5">
            <div className="step-number">6</div>
            <h2 className="step-title">Your Goals</h2>
            <p className="step-description">What matters most to you this semester? Select all that apply.</p>

            {GOAL_OPTIONS.map(g => (
              <button
                key={g.id}
                className={`goal-option ${formData.goals.includes(g.id) ? 'active' : ''}`}
                onClick={() => toggleGoal(g.id)}
              >
                <span className="goal-icon">{g.icon}</span>
                <div className="goal-info">
                  <h4>{g.title}</h4>
                  <p>{g.desc}</p>
                </div>
              </button>
            ))}

            <div className="step-actions">
              <button className="btn-secondary" onClick={back}>← Back</button>
              <button className="btn-primary" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="step-card glass-card" key="step6">
            <div className="welcome-screen">
              <div className="welcome-emoji">🎉</div>
              <h2>You're All Set, {formData.name || 'there'}!</h2>
              <p>We've set up your calendar with your classes, routines, and activities. You can always change things later.</p>
              <button className="btn-primary" onClick={finish} style={{ fontSize: 'var(--font-md)', padding: 'var(--space-md) var(--space-2xl)' }}>
                🚀 Launch My Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
