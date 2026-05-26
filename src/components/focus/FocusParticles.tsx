import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface FocusParticlesProps {
  isRunning: boolean;
  isZen: boolean;
  isFullscreen: boolean;
}

export const FocusParticles = React.memo(function FocusParticles({
  isRunning,
  isZen,
  isFullscreen,
}: FocusParticlesProps) {
  // Only render particles when active to save GPU memory cycles
  const active = isRunning && (isZen || isFullscreen);

  const particles = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 16 }).map((_, i) => ({
      id: i,
      bg: i % 3 === 0 ? 'rgba(139, 92, 246, 0.25)' : i % 3 === 1 ? 'rgba(236, 72, 153, 0.25)' : 'rgba(6, 182, 212, 0.25)',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: 8 + Math.random() * 8,
      delay: Math.random() * 5,
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2.5 h-2.5 rounded-full blur-[1px]"
          style={{
            background: p.bg,
            left: p.left,
            top: p.top,
          }}
          animate={{
            y: [-20, -120, -20],
            x: [0, Math.random() * 30 - 15, 0],
            scale: [1, 1.4, 1],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
});
