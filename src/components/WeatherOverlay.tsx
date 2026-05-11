import React from 'react';
import { motion } from 'framer-motion';
import type { WeatherType } from '../hooks/useWeather';

interface WeatherOverlayProps {
  type: WeatherType;
}

export default function WeatherOverlay({ type }: WeatherOverlayProps) {
  if (type === 'sunny') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 via-yellow-500/5 to-transparent"
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400/5 blur-[150px] rounded-full" />
      </div>
    );
  }

  if (type === 'rainy') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-blue-900/5" />
        {/* Simple rain particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100, x: Math.random() * 100 + 'vw' }}
            animate={{ y: '110vh' }}
            transition={{ 
              duration: Math.random() * 0.5 + 0.5, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 2 
            }}
            className="absolute w-[1px] h-10 bg-white/10"
          />
        ))}
      </div>
    );
  }

  if (type === 'night') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[#02040a]/40" />
        {/* Stars */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 5 }}
            className="absolute w-[2px] h-[2px] bg-white rounded-full"
            style={{ top: Math.random() * 100 + '%', left: Math.random() * 100 + '%' }}
          />
        ))}
      </div>
    );
  }

  return null;
}
