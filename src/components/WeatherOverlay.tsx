import React from 'react';
import { motion } from 'framer-motion';
import type { WeatherType } from '../hooks/useWeather';
import { useIsMobile } from '../hooks/useIsMobile';

interface WeatherOverlayProps {
  type: WeatherType;
}

const WeatherOverlay = React.memo(function WeatherOverlay({ type }: WeatherOverlayProps) {
  const isMobile = useIsMobile();

  const rainDrops = React.useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}vw`,
      duration: Math.random() * 0.5 + 0.5,
      delay: Math.random() * 2,
    }));
  }, []);

  const stars = React.useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
  }, []);

  if (type === 'sunny') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {!isMobile ? (
          <motion.div 
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 via-yellow-500/5 to-transparent"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/[0.03] via-yellow-500/[0.03] to-transparent opacity-50" />
        )}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400/5 blur-[150px] rounded-full" />
      </div>
    );
  }

  if (type === 'rainy') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-blue-900/5" />
        {/* Skip heavy rain particles on mobile, or render very few static ones */}
        {!isMobile ? (
          rainDrops.map((drop) => (
            <motion.div
              key={drop.id}
              initial={{ y: -100, x: drop.x }}
              animate={{ y: '110vh' }}
              transition={{ 
                duration: drop.duration, 
                repeat: Infinity, 
                ease: "linear",
                delay: drop.delay 
              }}
              className="absolute w-[1px] h-10 bg-white/10"
            />
          ))
        ) : (
          // Lightweight static rain lines for mobile
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-[1px] h-8 bg-white/5"
              style={{
                top: `${20 + i * 15}%`,
                left: `${15 + i * 20}%`
              }}
            />
          ))
        )}
      </div>
    );
  }

  if (type === 'night') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[#02040a]/40" />
        {/* Render static stars on mobile to avoid 30 simultaneous Framer Motion listeners */}
        {!isMobile ? (
          stars.map((star) => (
            <motion.div
              key={star.id}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
              className="absolute w-[2px] h-[2px] bg-white rounded-full"
              style={{ top: star.top, left: star.left }}
            />
          ))
        ) : (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-[1.5px] h-[1.5px] bg-white/20 rounded-full"
              style={{
                top: `${(i * 13) % 90}%`,
                left: `${(i * 27) % 95}%`
              }}
            />
          ))
        )}
      </div>
    );
  }

  return null;
});

export default WeatherOverlay;

