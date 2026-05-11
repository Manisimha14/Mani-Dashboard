import { useState, useEffect } from 'react';

export type WeatherType = 'sunny' | 'rainy' | 'cloudy' | 'night' | 'stormy';

interface WeatherState {
  type: WeatherType;
  temp: number;
  city: string;
  condition: string;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherState>({
    type: 'sunny',
    temp: 24,
    city: 'Your Space',
    condition: 'Perfectly Clear'
  });

  useEffect(() => {
    // In a real app, we'd fetch from an API
    // For this "Award Winning" experience, we'll simulate it based on local time
    const hour = new Date().getHours();
    
    let type: WeatherType = 'sunny';
    let condition = 'Clear Skies';
    let temp = 26;

    if (hour >= 19 || hour <= 5) {
      type = 'night';
      condition = 'Starry Night';
      temp = 18;
    } else if (hour >= 6 && hour <= 9) {
      type = 'sunny';
      condition = 'Golden Morning';
      temp = 22;
    } else {
      // Randomly simulate rain for variety
      const rand = Math.random();
      if (rand > 0.8) {
        type = 'rainy';
        condition = 'Soft Rain';
        temp = 19;
      } else if (rand > 0.6) {
        type = 'cloudy';
        condition = 'Overcast';
        temp = 21;
      }
    }

    setWeather({ type, temp, city: 'Dashboard Hub', condition });
  }, []);

  return weather;
}
