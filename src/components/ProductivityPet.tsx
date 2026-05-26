import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { getProductivityScore, todayString } from '../lib/utils';
import { X, MessageSquare, Zap, Heart } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import type { UserSettings } from '../types';

type PetState = 'excited' | 'awake' | 'sleepy';
type PetType = UserSettings['petType'];

const PET_TYPES: PetType[] = ['owl', 'fox', 'orb', 'bonsai'];
const PET_SPEECH: Record<PetState, string[]> = {
  excited: [
    'Absolute beast mode! 🔥',
    'Unstoppable focus—keep the streak.',
    'You are crushing it right now.',
  ],
  awake: [
    'I see that focus. Keep it up. 🚀',
    'Nice flow—let’s maintain momentum.',
    'Sharp and steady wins the day.',
  ],
  sleepy: [
    'Zzz... wake me up with some work.',
    'Time for a power-up?',
    'A little focus can snap you awake.',
  ]
};

function ProductivityPet() {
  const isMobile = useIsMobile();
  const dailyActivity = useAppStore(s => s.dailyActivity);
  const petType = useAppStore(s => s.userSettings.petType);
  const updateUserSettings = useAppStore(s => s.updateUserSettings);
  const [isOpen, setIsOpen] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [petPosition, setPetPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const stored = window.localStorage.getItem('productivity-pet-position');
      return stored ? JSON.parse(stored) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);
  const blinkIntervalRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMouseRef = useRef<MouseEvent | null>(null);
  const isDraggingRef = useRef(false);
  
  const eyeX = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });
  const eyeY = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 });

  useEffect(() => {
    if (isMobile) return;

    const updateConstraints = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxLeft = Math.max(window.innerWidth - rect.width - 20, 0);
      const maxTop = Math.max(window.innerHeight - rect.height - 20, 0);
      setDragConstraints({ left: -maxLeft, right: 0, top: -maxTop, bottom: 0 });
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);

    return () => {
      window.removeEventListener('resize', updateConstraints);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (event: MouseEvent) => {
      pendingMouseRef.current = event;
      if (rafRef.current !== null) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const next = pendingMouseRef.current;
        if (!next) return;

        const x = (next.clientX / window.innerWidth - 0.5) * 8;
        const y = (next.clientY / window.innerHeight - 0.5) * 8;
        eyeX.set(x);
        eyeY.set(y);
      });
    };

    const startBlink = () => {
      setIsBlinking(true);
      if (blinkTimeoutRef.current) {
        window.clearTimeout(blinkTimeoutRef.current);
      }
      blinkTimeoutRef.current = window.setTimeout(() => setIsBlinking(false), 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    blinkIntervalRef.current = window.setInterval(startBlink, 4000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (blinkIntervalRef.current) {
        window.clearInterval(blinkIntervalRef.current);
      }
      if (blinkTimeoutRef.current) {
        window.clearTimeout(blinkTimeoutRef.current);
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isMobile, eyeX, eyeY]);

  const todayActivity = React.useMemo(() => {
    return dailyActivity.reduce<Record<string, typeof dailyActivity[number]>>((map, activity) => {
      map[activity.date] = activity;
      return map;
    }, {})[todayString()];
  }, [dailyActivity]);

  const prodScore = React.useMemo(() => {
    return getProductivityScore(
      todayActivity?.chaptersRead || 0,
      todayActivity?.problemsSolved || 0,
      todayActivity?.focusMinutes || 0
    );
  }, [todayActivity]);
  
  const state = React.useMemo(() => {
    return prodScore >= 70 ? 'excited' : prodScore >= 20 ? 'awake' : 'sleepy';
  }, [prodScore]);

  const speechLine = React.useMemo(() => {
    const options = PET_SPEECH[state];
    const seed = state.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return options[seed % options.length];
  }, [state]);

  if (isMobile) return null;

  // Animation variants
  const bodyVariants: import('framer-motion').Variants = {
    sleepy: { y: [0, 5, 0], scaleY: [1, 0.95, 1], transition: { duration: 4, repeat: Infinity } },
    awake: { y: [0, -8, 0], scaleY: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const } },
    excited: { 
      y: [0, -20, 0], 
      scaleY: [1, 1.2, 0.9, 1], 
      rotate: [-5, 5, -5],
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" as const } 
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      drag
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0.1}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      whileDrag={{ scale: 1.05 }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={(_, info) => {
        isDraggingRef.current = false;
        const next = { x: petPosition.x + info.offset.x, y: petPosition.y + info.offset.y };
        setPetPosition(next);
        window.localStorage.setItem('productivity-pet-position', JSON.stringify(next));
      }}
      style={{ x: petPosition.x, y: petPosition.y }}
      className="hidden md:flex fixed bottom-10 right-10 z-[200] flex-col items-end gap-6 pointer-events-auto cursor-grab active:cursor-grabbing"
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, x: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-28 right-0 glass-card px-6 py-3 border-violet-500/30 shadow-2xl origin-bottom-right whitespace-nowrap"
          >
            <div className="text-[11px] font-black text-white/90 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={12} className="text-violet-400" />
              {speechLine}
            </div>
            <div className="absolute -bottom-2 right-10 w-4 h-4 bg-[#0a0b14]/90 rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Dynamic Shadow */}
        <motion.div 
          animate={{ scale: state === 'excited' ? [1, 0.6, 1] : [1, 0.8, 1], opacity: [0.2, 0.1, 0.2] }}
          transition={{ duration: state === 'excited' ? 1 : 2, repeat: Infinity }}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/40 blur-md rounded-full"
        />

        {/* The Kinetic Creature */}
        <motion.button
          onClick={() => {
            if (isDraggingRef.current) return;
            setIsOpen(!isOpen);
          }}
          aria-expanded={isOpen}
          aria-label="Open productivity pet panel"
          variants={bodyVariants}
          animate={state}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className="relative w-20 h-20 group cursor-pointer z-[201]"
        >
          {/* Main Body */}
          <div className={`absolute inset-0 rounded-[2.5rem] transition-colors duration-1000 border-2 ${
            petType === 'owl' ? 'bg-indigo-600 border-indigo-400' :
            petType === 'fox' ? 'bg-orange-600 border-orange-400' :
            petType === 'orb' ? 'bg-violet-600 border-violet-400' :
            'bg-emerald-600 border-emerald-400'
          } shadow-2xl shadow-black/40 overflow-hidden`}>
            
            {/* Glossy highlight */}
            <div className="absolute top-2 left-4 w-6 h-3 bg-white/20 rounded-full blur-[2px]" />
            
            {/* Eyes Container */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="relative w-4 h-6 bg-white rounded-full overflow-hidden">
                  <motion.div 
                    style={{ x: eyeX, y: eyeY }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black rounded-full"
                  />
                  {/* Blink Overlay */}
                  <motion.div 
                    animate={{ height: isBlinking ? '100%' : '0%' }}
                    className="absolute top-0 left-0 right-0 bg-inherit z-20"
                  />
                </div>
              ))}
            </div>

            {/* Mouth/Beak */}
            <motion.div 
              animate={{ scaleY: state === 'excited' ? 1.5 : 1 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/30 rounded-full" 
            />
          </div>

          {/* Evolution Aura */}
          {state === 'excited' && (
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-[-10px] rounded-full border-2 border-violet-500/50 blur-md"
            />
          )}
        </motion.button>
      </div>

      {/* Expanded Pet Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="glass-card w-72 p-6 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] origin-bottom-right pointer-events-auto"
            style={{ background: 'rgba(10,11,20,0.95)' }}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-white font-black text-lg tracking-tight uppercase">{petType} Spirit</h4>
                <div className="text-[10px] text-violet-400 uppercase tracking-widest font-black mt-1">
                  Evolution: Stage {prodScore > 50 ? '3' : '1'}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close pet panel"
                className="text-white/20 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">Happiness Core</div>
                  <div className="text-xs font-black text-white">{prodScore}%</div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${prodScore}%` }}
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[9px] text-white/30 uppercase font-black mb-1">Energy</div>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Zap size={12} className="text-amber-400" />
                    <span>High</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[9px] text-white/30 uppercase font-black mb-1">Love</div>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Heart size={12} className="text-red-400" />
                    <span>Pure</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-3">Bonding Studio</div>
                <div className="grid grid-cols-2 gap-2">
                  {PET_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => updateUserSettings({ petType: type })}
                      aria-label={`Choose ${type} pet`}
                      className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                        petType === type 
                        ? 'bg-violet-600/20 border-violet-500/50 text-white' 
                        : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(ProductivityPet);


