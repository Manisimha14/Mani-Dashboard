import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2, Calendar, Zap, Trophy, Target, MessageSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { format, parseISO } from 'date-fns';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationRead, clearNotifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (category: string) => {
    switch (category) {
      case 'reminders': return <Calendar size={14} className="text-violet-400" />;
      case 'streak': return <Zap size={14} className="text-orange-400" />;
      case 'achievements': return <Trophy size={14} className="text-amber-400" />;
      case 'focus': return <Target size={14} className="text-emerald-400" />;
      default: return <MessageSquare size={14} className="text-white/40" />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-label="Notification center"
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0b14]/95 backdrop-blur-2xl z-[251] border-l border-white/5 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell size={20} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Intelligence Center</h2>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{unreadCount} Unread Notifications</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearNotifications}
                  aria-label="Clear all notifications"
                  className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
                  title="Clear All"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                  <Bell size={48} className="mb-4" />
                  <p className="text-sm font-medium">System signals are clear.</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1">No pending notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all relative group ${
                      n.read 
                        ? 'bg-white/[0.02] border-white/5' 
                        : 'bg-violet-600/[0.03] border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.05)]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 rounded-lg bg-white/5">
                        {getIcon(n.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                           <h3 className={`text-sm font-bold truncate ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</h3>
                           <span className="text-[9px] text-white/20 font-medium whitespace-nowrap">
                             {format(parseISO(n.timestamp), 'HH:mm')}
                           </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${n.read ? 'text-white/30' : 'text-white/50'}`}>
                          {n.message}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <button 
                        onClick={() => markNotificationRead(n.id)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-violet-500/10 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity border border-violet-500/20"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/20 text-center">
               <div className="text-[9px] text-white/10 font-black uppercase tracking-[0.2em]">End of Transmission</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
