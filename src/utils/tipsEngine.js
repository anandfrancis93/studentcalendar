import { getEventsForDate, isSameDay, addDays } from './dateUtils';

const GENERAL_TIPS = [
  { icon: '💡', text: 'Review your notes within 24 hours of class to boost retention by up to 60%.' },
  { icon: '🧘', text: 'Take a 5-minute stretch break for every 45 minutes of study.' },
  { icon: '💧', text: 'Stay hydrated — aim for 8 glasses of water today.', category: 'health' },
  { icon: '🎯', text: 'Use the Pomodoro technique: 25 min focus, 5 min break.' },
  { icon: '🌙', text: 'Aim for 7-9 hours of sleep for optimal academic performance.' },
  { icon: '📱', text: 'Put your phone in Do Not Disturb during study sessions.' },
  { icon: '🍎', text: 'Eat brain-boosting foods: berries, nuts, dark chocolate.' },
  { icon: '🏃', text: '30 minutes of exercise can improve focus for 2-3 hours after.' },
  { icon: '📝', text: 'Start assignments early — break them into 30-minute chunks.' },
  { icon: '🤝', text: 'Study groups can help reinforce concepts. Reach out to classmates!' },
  { icon: '📚', text: 'Active recall (testing yourself) beats re-reading by 50%.' },
  { icon: '🎵', text: 'Try lo-fi music or white noise to improve concentration.' },
];

export function generateTips(events, onboardingData) {
  const now = new Date();
  const hour = now.getHours();
  const tips = [];

  // Time-based greetings and tips
  if (hour >= 5 && hour < 12) {
    tips.push({ icon: '🌅', text: 'Good morning! Start your day with your most challenging task while your mind is fresh.', priority: 1 });
  } else if (hour >= 12 && hour < 17) {
    tips.push({ icon: '☀️', text: 'Afternoon slump? Take a quick walk or do some light stretching to recharge.', priority: 1 });
  } else if (hour >= 17 && hour < 21) {
    tips.push({ icon: '🌆', text: 'Evening is great for reviewing what you learned today. Quick flashcard session?', priority: 1 });
  } else {
    tips.push({ icon: '🌙', text: 'It\'s getting late! Wrap up your work and get some quality rest.', priority: 1 });
  }

  // Event-based tips
  const todayEvents = getEventsForDate(events, now);
  const tomorrowEvents = getEventsForDate(events, addDays(now, 1));

  if (todayEvents.length === 0) {
    tips.push({ icon: '📅', text: 'No events today — perfect day for deep work or catching up on readings!', priority: 2 });
  } else if (todayEvents.length >= 5) {
    tips.push({ icon: '⚡', text: `Busy day ahead with ${todayEvents.length} events! Prioritize and take breaks between them.`, priority: 2 });
  }

  // Find free blocks
  const busyHours = new Set();
  todayEvents.forEach(e => {
    const start = parseInt(e.startTime?.split(':')[0] || 0);
    const end = parseInt(e.endTime?.split(':')[0] || start + 1);
    for (let h = start; h < end; h++) busyHours.add(h);
  });

  let freeBlockStart = null;
  let maxFreeBlock = 0;
  let maxFreeStart = null;
  const searchStart = Math.max(hour, 8);
  for (let h = searchStart; h <= 22; h++) {
    if (!busyHours.has(h)) {
      if (freeBlockStart === null) freeBlockStart = h;
      const blockLen = h - freeBlockStart + 1;
      if (blockLen > maxFreeBlock) {
        maxFreeBlock = blockLen;
        maxFreeStart = freeBlockStart;
      }
    } else {
      freeBlockStart = null;
    }
  }

  if (maxFreeBlock >= 2) {
    const startH = maxFreeStart % 12 || 12;
    const ampm = maxFreeStart < 12 ? 'AM' : 'PM';
    tips.push({ icon: '⏰', text: `You have a ${maxFreeBlock}-hour free block starting at ${startH} ${ampm} — great for focused study or exercise!`, priority: 2 });
  }

  if (tomorrowEvents.length > 0) {
    tips.push({ icon: '📋', text: `You have ${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} tomorrow. Consider prepping tonight!`, priority: 3 });
  }

  // Onboarding-based tips
  if (onboardingData) {
    if (onboardingData.goals?.includes('gpa')) {
      tips.push({ icon: '🎓', text: 'Working toward your GPA goal — review your weakest subject today!', priority: 3 });
    }
    if (onboardingData.goals?.includes('fitness')) {
      tips.push({ icon: '💪', text: 'Don\'t skip your workout today — even 20 minutes makes a difference!', priority: 3 });
    }
    if (onboardingData.goals?.includes('social')) {
      tips.push({ icon: '👥', text: 'Reach out to a friend or classmate today — social connections matter!', priority: 3 });
    }
    if (onboardingData.studyPreference === 'morning' && hour >= 5 && hour < 10) {
      tips.push({ icon: '📖', text: 'This is your peak study time! Dive into that challenging material now.', priority: 1 });
    }
    if (onboardingData.studyPreference === 'night' && hour >= 20) {
      tips.push({ icon: '🦉', text: 'Night owl study time! You do your best work now — make it count.', priority: 1 });
    }
  }

  // Add some general tips
  const shuffled = [...GENERAL_TIPS].sort(() => Math.random() - 0.5);
  tips.push(...shuffled.slice(0, 3).map(t => ({ ...t, priority: 4 })));

  // Sort by priority and return
  return tips.sort((a, b) => a.priority - b.priority);
}
