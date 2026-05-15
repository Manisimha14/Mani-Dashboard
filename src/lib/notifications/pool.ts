import type { ContextualMessage } from './types';

export const WEATHER_POOL: Record<string, ContextualMessage[]> = {
  sunny: [
    { id: 'w_sun_1', title: 'Vitamin D Warning', message: "It's bright outside, but your screen is brighter. Stay focused!", tone: 'fun', category: 'weather', icon: 'sun' },
    { id: 'w_sun_2', title: 'Solar Power', message: "Clear skies today. Perfect for crushing that LeetCode problem.", tone: 'motivation', category: 'weather', icon: 'zap' },
    { id: 'w_sun_3', title: 'Outshined', message: "Sun is out, but your productivity is blinding. Keep it up.", tone: 'success', category: 'weather' }
  ],
  rainy: [
    { id: 'w_rain_1', title: 'Lo-Fi Vibes', message: "It's raining outside. The perfect aesthetic for a deep focus session.", tone: 'motivation', category: 'weather', icon: 'cloud-rain' },
    { id: 'w_rain_2', title: 'Duck Mode', message: "Waddle you doing? Get back to work!", tone: 'fun', category: 'weather' },
    { id: 'w_rain_3', title: 'Rainy Day Grind', message: "Perfect weather for indoor legends. No distractions today.", tone: 'info', category: 'weather' }
  ],
  cloudy: [
    { id: 'w_cloud_1', title: 'Dreamer Mode', message: "Cloudy enough for big ideas. Capture them in your trackers.", tone: 'info', category: 'weather' },
    { id: 'w_cloud_2', title: 'Silver Lining', message: "Even on gray days, your streaks are shining bright.", tone: 'motivation', category: 'weather' }
  ],
  night: [
    { id: 'w_night_1', title: 'Midnight Oil', message: "The world is asleep, but you're building a legacy.", tone: 'motivation', category: 'weather', icon: 'moon' },
    { id: 'w_night_2', title: 'Owl Hours', message: "Whooo's still working? Oh, it's just a genius. Carry on.", tone: 'fun', category: 'weather' }
  ]
};

export const SCORE_POOL: ContextualMessage[] = [
  { id: 's_0', title: 'Awkward Silence...', message: "Your trackers are emptier than my bank account. Let's fix that.", tone: 'fun', category: 'score', scoreRange: 'zero', priority: 10 },
  { id: 's_low', title: 'Warming Up', message: "Engines are starting. Let's get that first completion done.", tone: 'info', category: 'score', scoreRange: 'low', priority: 5 },
  { id: 's_mid', title: 'In the Zone', message: "You're hitting your stride. Keep the rhythm going.", tone: 'motivation', category: 'score', scoreRange: 'mid', priority: 5 },
  { id: 's_high', title: 'Unstoppable', message: "You're basically a human CPU right now. Keep it at 100%!", tone: 'success', category: 'score', scoreRange: 'high', priority: 8 },
  { id: 's_god', title: 'God Mode', message: "Productivity levels are off the charts. Remember to blink.", tone: 'fun', category: 'score', scoreRange: 'god', priority: 12 }
];

export const STREAK_POOL: ContextualMessage[] = [
  { id: 'st_r_7', title: 'Library Legend', message: "7-day reading streak. You're building a massive knowledge vault.", tone: 'success', category: 'streak', streakType: 'reading', priority: 15, icon: 'book' },
  { id: 'st_c_7', title: 'Code Warrior', message: "7-day coding streak. Your logic architecture is getting solid.", tone: 'success', category: 'streak', streakType: 'coding', priority: 15, icon: 'code' },
  { id: 'st_f_7', title: 'Focus Master', message: "7-day focus streak. Your concentration is a superpower.", tone: 'success', category: 'streak', streakType: 'focus', priority: 15, icon: 'zap' },
  { id: 'st_any', title: 'Consistency King', message: "Don't let the flame die out. Habit armor is almost complete.", tone: 'motivation', category: 'streak', streakType: 'any', priority: 10, icon: 'flame' }
];

export const TIME_POOL: ContextualMessage[] = [
  { id: 't_morning', title: 'Morning Warrior', message: "Win the morning, win the day. Let's set the tone.", tone: 'motivation', category: 'time', timeSegment: 'morning', priority: 3 },
  { id: 't_afternoon', title: 'Mid-Day Surge', message: "Post-lunch slump? Not for you. Power through.", tone: 'info', category: 'time', timeSegment: 'afternoon', priority: 3 },
  { id: 't_evening', title: 'Evening Sprint', message: "Finishing strong is how legends are made.", tone: 'motivation', category: 'time', timeSegment: 'evening', priority: 3 },
  { id: 't_late', title: 'Late Night Protocol', message: "Quiet work brings the loudest results. The grind is real.", tone: 'motivation', category: 'time', timeSegment: 'late', priority: 6 }
];
