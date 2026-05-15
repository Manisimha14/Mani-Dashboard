import { useState, useEffect } from 'react';

export type WeatherType = 'sunny' | 'rainy' | 'cloudy' | 'night' | 'stormy';

interface WeatherState {
  type: WeatherType;
  temp: number;
  city: string;
  condition: string;
  loading: boolean;
}

/**
 * Deterministically generates "atmosphere" weather based on time and date.
 * This ensures the UI feels stable and intentional, not randomly flickering.
 */
function generateContextualWeather(): Omit<WeatherState, 'loading'> {
  const now = new Date();
  const hour = now.getHours();
  const daySeed = now.getDate();
  const monthSeed = now.getMonth();

  // Pseudo-randomness that is stable for the entire day
  const dailySeed = (daySeed + monthSeed * 31) % 10;

  let type: WeatherType = 'sunny';
  let temp = 24;
  let condition = 'Optimal Focus';

  // 1. Time Buckets (Production-grade buckets)
  if (hour >= 5 && hour < 8) {
    // Dawn
    type = 'sunny';
    temp = 18 + (dailySeed % 4);
    condition = 'Golden Morning';
  } else if (hour >= 8 && hour < 12) {
    // Morning
    type = dailySeed > 7 ? 'cloudy' : 'sunny';
    temp = 22 + (dailySeed % 5);
    condition = 'High Velocity Skies';
  } else if (hour >= 12 && hour < 17) {
    // Afternoon
    type = dailySeed > 8 ? 'rainy' : dailySeed > 6 ? 'cloudy' : 'sunny';
    temp = 26 + (dailySeed % 6);
    condition = 'Peak Performance Clarity';
  } else if (hour >= 17 && hour < 19) {
    // Sunset
    type = 'cloudy';
    temp = 23 - (dailySeed % 3);
    condition = 'Sunset Momentum';
  } else if (hour >= 19 && hour < 22) {
    // Evening
    type = 'night';
    temp = 20 - (dailySeed % 4);
    condition = 'Deep Work Atmosphere';
  } else {
    // Late Night / Early Morning
    type = 'night';
    temp = 16 + (dailySeed % 3);
    condition = 'Quiet Night Protocol';
  }

  // 2. Add Stormy / Rainy variance based on day seed if not in stable night/dawn
  if (hour > 8 && hour < 20 && dailySeed > 8) {
    type = 'stormy';
    condition = 'Charged Productivity';
    temp -= 5;
  }

  // 3. Location Intelligence
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = zone.split('/').pop()?.replace('_', ' ') || 'Local Workspace';

  return { type, temp, city, condition };
}

export function useWeather() {
  // Initialize immediately to prevent hydration flicker
  const [weather, setWeather] = useState<WeatherState>(() => ({
    ...generateContextualWeather(),
    loading: false
  }));

  useEffect(() => {
    // Recompute on hour change or every 30 minutes
    const interval = setInterval(() => {
      setWeather(prev => ({
        ...generateContextualWeather(),
        loading: false
      }));
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return weather;
}
