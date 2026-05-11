import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

export const showAchievementToast = (title: string, icon: string = '🏆') => {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-[#1a1b2e]/95 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-4 shadow-[0_20px_50px_rgba(139,92,246,0.3)] flex items-center gap-4 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent pointer-events-none" />
      <div className="w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center text-3xl relative z-10 shadow-glow-sm">
        {icon}
      </div>
      <div className="flex-1 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={12} className="text-violet-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Achievement Unlocked</span>
        </div>
        <h3 className="font-black text-white text-lg tracking-tight">{title}</h3>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Trophy size={80} className="text-violet-400 rotate-12" />
      </div>
    </motion.div>
  ), { duration: 5000 });
};
