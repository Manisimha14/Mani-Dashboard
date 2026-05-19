import React from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Trophy, Sparkles, Bell, Zap, Info } from 'lucide-react';

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

export const showNotificationToast = (
  title: string,
  message: string,
  category: 'reminders' | 'streak' | 'achievements' | 'focus' | 'productivity' | 'goals',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  onAction?: () => void,
  actionText?: string
) => {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-sm w-full bg-[#0a0b14]/95 backdrop-blur-xl border ${
        priority === 'high' || priority === 'urgent'
          ? 'border-violet-500/30 shadow-[0_20px_50px_rgba(139,92,246,0.25)]'
          : 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      } rounded-2xl p-4 flex items-start gap-3.5 relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      
      {/* Category Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 ${
        category === 'reminders' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
        category === 'streak' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
        category === 'focus' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
        category === 'achievements' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
        'bg-white/5 text-white/50 border border-white/10'
      }`}>
        {category === 'reminders' && <Bell size={18} />}
        {category === 'streak' && <Zap size={18} />}
        {category === 'focus' && <Zap size={18} />}
        {category === 'achievements' && <Trophy size={18} />}
        {category !== 'reminders' && category !== 'streak' && category !== 'focus' && category !== 'achievements' && <Info size={18} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30">
            {category}
          </span>
          {priority !== 'normal' && (
            <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${
              priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
              priority === 'high' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' :
              'bg-white/10 text-white/40'
            }`}>
              {priority}
            </span>
          )}
        </div>
        <h3 className="font-bold text-white text-xs tracking-tight truncate">{title}</h3>
        <p className="text-[11px] text-white/50 leading-relaxed mt-1 font-medium">{message}</p>
        
        {/* Quick CTA Actions */}
        {onAction && actionText && (
          <button
            onClick={() => {
              onAction();
              toast.dismiss(t.id);
            }}
            className="mt-3 px-3 py-1.5 w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95 transition-all text-center border border-violet-400/20"
          >
            {actionText}
          </button>
        )}
      </div>
      
      {/* Dismiss button */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-white/20 hover:text-white/40 text-[10px] font-bold p-1 absolute top-2 right-2 transition-colors"
      >
        ✕
      </button>
    </motion.div>
  ), { duration: 5000 });
};
