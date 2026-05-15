import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { getContextualNotifications } from '../lib/notifications';
import { useWeather } from '../hooks/useWeather';
import { getProductivityScore } from '../lib/utils';
import { Sparkles, Sun, CloudRain, Moon, Zap, Flame, Clock } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  sun: Sun,
  'cloud-rain': CloudRain,
  moon: Moon,
  zap: Zap,
  flame: Flame,
  clock: Clock
};

export default function ContextualAlerts() {
  const { 
    dailyActivity, readingStreak, codingStreak, focusStreak, 
    userSettings, focusSessions, problems 
  } = useAppStore();
  const { type: weatherType } = useWeather();
  
  const notifications = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = dailyActivity.find(a => a.date === today);
    const prodScore = getProductivityScore(
      todayActivity?.chaptersRead || 0,
      todayActivity?.problemsSolved || 0,
      todayActivity?.focusMinutes || 0
    );

    return getContextualNotifications({
      weatherType: weatherType,
      prodScore,
      readingStreak: readingStreak.currentStreak,
      codingStreak: codingStreak.currentStreak,
      focusStreak: focusStreak.currentStreak,
      hour: new Date().getHours(),
      humorLevel: 'balanced' // Could be from userSettings in a real app
    });
  }, [weatherType, dailyActivity, readingStreak, codingStreak, focusStreak]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-violet-400" />
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Contextual Pulse</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((n, i) => {
            const Icon = n.icon ? (ICON_MAP[n.icon] || Sparkles) : Sparkles;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: i * 0.1, type: 'spring', damping: 15 }}
                className="glass-card p-4 relative overflow-hidden group hover:border-white/20 transition-all"
              >
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`p-2 rounded-xl bg-white/5 ${
                    n.tone === 'fun' ? 'text-pink-400' :
                    n.tone === 'motivation' ? 'text-amber-400' :
                    n.tone === 'success' ? 'text-emerald-400' : 'text-blue-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                      {n.message}
                    </p>
                  </div>
                </div>
                
                {/* Background Accent */}
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 blur-3xl opacity-5 rounded-full bg-current ${
                  n.tone === 'fun' ? 'text-pink-400' :
                  n.tone === 'motivation' ? 'text-amber-400' :
                  n.tone === 'success' ? 'text-emerald-400' : 'text-blue-400'
                }`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
