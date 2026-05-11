import type { WeatherType } from '../hooks/useWeather';

export interface ContextualMessage {
  title: string;
  message: string;
  type: 'funny' | 'motivating' | 'weather' | 'mood';
}

const WEATHER_MESSAGES: Record<WeatherType, ContextualMessage[]> = {
  sunny: [
    { title: 'Vitamin D Warning', message: "It's bright outside, but your screen is brighter. Stay focused!", type: 'funny' },
    { title: 'Solar Power', message: "Clear skies today. Perfect for crushing that LeetCode problem.", type: 'weather' }
  ],
  rainy: [
    { title: 'Lo-Fi Vibes', message: "It's raining outside. The perfect aesthetic for a deep focus session.", type: 'weather' },
    { title: 'Duck Mode', message: "Waddle you doing? Get back to work!", type: 'funny' }
  ],
  cloudy: [
    { title: 'Dreamer Mode', message: "Cloudy enough for big ideas. Capture them in your trackers.", type: 'mood' },
    { title: 'Silver Lining', message: "Even on gray days, your streaks are shining bright.", type: 'motivating' }
  ],
  night: [
    { title: 'Midnight Oil', message: "The world is asleep, but you're building a legacy.", type: 'motivating' },
    { title: 'Owl Hours', message: "Whooo's still working? Oh, it's just a genius. Carry on.", type: 'funny' }
  ],
  stormy: [
    { title: 'Ride the Storm', message: "Thundering progress detected. Your momentum is unstoppable.", type: 'weather' },
    { title: 'Zap!', message: "Charged and ready. Let's strike some tasks off that list.", type: 'funny' }
  ]
};

const MOOD_MESSAGES: ContextualMessage[] = [
  { title: "Mom's Proud", message: "If your mom saw this productivity score, she'd finally stop asking about your cousins.", type: 'funny' },
  { title: "Future You", message: "Future you is currently high-fiving the air because of the work you're doing now.", type: 'motivating' },
  { title: "No Excuses", message: "Coffee is just bean juice. Your real fuel is ambition.", type: 'funny' },
  { title: "Legendary Status", message: "You're doing better than 99% of people currently doomscrolling.", type: 'motivating' }
];

export function getContextualNotifications(weatherType: WeatherType, score: number): ContextualMessage[] {
  const messages: ContextualMessage[] = [];
  
  // Pick one from weather
  const wOptions = WEATHER_MESSAGES[weatherType];
  messages.push(wOptions[Math.floor(Math.random() * wOptions.length)]);
  
  // Pick one from mood/funny
  messages.push(MOOD_MESSAGES[Math.floor(Math.random() * MOOD_MESSAGES.length)]);
  
  // Add a score-based one
  if (score > 70) {
    messages.push({ title: "Unstoppable", message: "You're basically a human CPU right now. Keep it at 100%!", type: 'motivating' });
  } else if (score === 0) {
    messages.push({ title: "Awkward Silence...", message: "Your trackers are emptier than my bank account. Let's fix that.", type: 'funny' });
  }
  
  return messages;
}
