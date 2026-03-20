import { getEventsForDate, formatTime, isSameDay, addDays, DAYS_FULL } from './dateUtils';

export function processMessage(input, events, onboardingData) {
  const msg = input.toLowerCase().trim();
  const now = new Date();
  const todayEvents = getEventsForDate(events, now);
  const tomorrowEvents = getEventsForDate(events, addDays(now, 1));

  // Greetings
  if (/^(hi|hello|hey|sup|yo|what'?s up)/i.test(msg)) {
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = onboardingData?.name ? `, ${onboardingData.name}` : '';
    return `${greeting}${name}! 👋 I'm your calendar assistant. Ask me about your schedule, free time, or study tips!`;
  }

  // "What do I have today?" / "Today's schedule"
  if (/today|today'?s (schedule|events|plan|agenda)/i.test(msg) || /what.*have.*today/i.test(msg) || /what'?s.*today/i.test(msg)) {
    if (todayEvents.length === 0) {
      return "You don't have any events today! 🎉 It's a perfect day for deep work, catching up on readings, or self-care.";
    }
    const sorted = [...todayEvents].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const list = sorted.map(e => {
      const time = e.startTime ? formatTime(...e.startTime.split(':').map(Number)) : 'All day';
      return `• **${time}** — ${e.title}${e.category ? ` (${e.category})` : ''}`;
    }).join('\n');
    return `Here's your schedule for today (${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''}):\n\n${list}`;
  }

  // "What about tomorrow?"
  if (/tomorrow|tomorrow'?s/i.test(msg)) {
    if (tomorrowEvents.length === 0) {
      return "Nothing on the calendar for tomorrow! Enjoy the free day. 😊";
    }
    const sorted = [...tomorrowEvents].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const list = sorted.map(e => {
      const time = e.startTime ? formatTime(...e.startTime.split(':').map(Number)) : 'All day';
      return `• **${time}** — ${e.title}`;
    }).join('\n');
    return `Here's what you have tomorrow (${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''}):\n\n${list}`;
  }

  // "When is my next class?"
  if (/next class|next lecture|upcoming class/i.test(msg)) {
    const classEvents = events
      .filter(e => e.category === 'class' && new Date(e.date + 'T' + (e.startTime || '00:00')) >= now)
      .sort((a, b) => new Date(a.date + 'T' + (a.startTime || '00:00')) - new Date(b.date + 'T' + (b.startTime || '00:00')));

    if (classEvents.length === 0) {
      return "I don't see any upcoming classes on your calendar. Try adding your class schedule!";
    }

    const next = classEvents[0];
    const nextDate = new Date(next.date);
    const dayStr = isSameDay(nextDate, now) ? 'today' :
      isSameDay(nextDate, addDays(now, 1)) ? 'tomorrow' :
        `on ${DAYS_FULL[nextDate.getDay()]}`;
    const timeStr = next.startTime ? ` at ${formatTime(...next.startTime.split(':').map(Number))}` : '';
    return `Your next class is **${next.title}** ${dayStr}${timeStr}. 📚`;
  }

  // "Am I free at X?"
  const freeMatch = msg.match(/free.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) || msg.match(/busy.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (freeMatch) {
    let hour = parseInt(freeMatch[1]);
    const ampm = freeMatch[3]?.toLowerCase();
    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const conflicts = todayEvents.filter(e => {
      if (!e.startTime) return false;
      const startH = parseInt(e.startTime.split(':')[0]);
      const endH = e.endTime ? parseInt(e.endTime.split(':')[0]) : startH + 1;
      return hour >= startH && hour < endH;
    });

    if (conflicts.length === 0) {
      return `Yes! You're free at ${formatTime(hour)}. ✅ Want to add an event?`;
    }
    const conflictList = conflicts.map(e => `"${e.title}"`).join(', ');
    return `You have ${conflictList} at that time. 📌`;
  }

  // "Suggest a study plan" / "Help me study"
  if (/study plan|study schedule|help.*stud/i.test(msg) || /suggest.*plan/i.test(msg)) {
    const busyHours = new Set();
    todayEvents.forEach(e => {
      const start = parseInt(e.startTime?.split(':')[0] || 0);
      const end = e.endTime ? parseInt(e.endTime.split(':')[0]) : start + 1;
      for (let h = start; h < end; h++) busyHours.add(h);
    });

    const freeBlocks = [];
    let blockStart = null;
    const currentHour = now.getHours();
    for (let h = Math.max(currentHour, 8); h <= 22; h++) {
      if (!busyHours.has(h)) {
        if (blockStart === null) blockStart = h;
      } else {
        if (blockStart !== null) {
          freeBlocks.push({ start: blockStart, end: h });
          blockStart = null;
        }
      }
    }
    if (blockStart !== null) freeBlocks.push({ start: blockStart, end: 23 });

    if (freeBlocks.length === 0) {
      return "Your day looks packed! Try squeezing in 20-minute review sessions between events. Use active recall for maximum efficiency. 💪";
    }

    const plan = freeBlocks.slice(0, 3).map((b, i) => {
      const duration = b.end - b.start;
      const activity = i === 0 ? 'Focus session (hardest subject)' :
        i === 1 ? 'Review & practice problems' : 'Light reading or flashcards';
      return `• **${formatTime(b.start)} – ${formatTime(b.end)}** (${duration}h): ${activity}`;
    }).join('\n');

    return `Here's a study plan based on your free time today:\n\n${plan}\n\n💡 Remember: take 5-min breaks between sessions!`;
  }

  // "How many events" / "How busy"
  if (/how many events|how busy|am i busy/i.test(msg)) {
    const thisWeek = events.filter(e => {
      const d = new Date(e.date);
      const diff = (d - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    });
    return `You have **${todayEvents.length}** event${todayEvents.length !== 1 ? 's' : ''} today and **${thisWeek.length}** events this week. ${thisWeek.length > 15 ? "That's a loaded week — prioritize and take breaks!" : "Looks manageable!"}`;
  }

  // Motivational
  if (/motivat|inspire|encourage|tired|stressed|overwhelm/i.test(msg)) {
    const quotes = [
      "You're doing better than you think! Every small step counts. 🌟",
      "Rome wasn't built in a day. Focus on progress, not perfection. 💪",
      "Take a deep breath. You've handled hard things before, and you'll handle this too. 🧘",
      "Remember: consistency beats intensity. Show up, even if it's small. 🔥",
      "Your future self will thank you for the effort you put in today. Keep going! 🚀",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // Help
  if (/help|what can you do|commands/i.test(msg)) {
    return `Here's what I can help with:\n\n• "What do I have today?" — view today's schedule\n• "What about tomorrow?" — see tomorrow's events\n• "When is my next class?" — find upcoming classes\n• "Am I free at 3pm?" — check availability\n• "Suggest a study plan" — get a study plan based on free time\n• "How busy am I?" — get event stats\n• Or just say hi! 😊`;
  }

  // Default
  const defaults = [
    "I'm not sure I understood that. Try asking about your schedule, free time, or say 'help' for options! 🤔",
    "Hmm, could you rephrase that? I can help with your calendar, study plans, and more!",
    "I didn't quite get that! Type 'help' to see what I can do for you. 📋",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}
