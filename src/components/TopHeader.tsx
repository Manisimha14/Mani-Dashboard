import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Search, Bell, Settings as SettingsIcon, User, Command, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSoundFX } from '../hooks/useSoundFX';
import ProfileOverlay from './ProfileOverlay';
import NotificationCenter from './NotificationCenter';

export default function TopHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { userSettings, notifications } = useAppStore();
  const navigate = useNavigate();
  const { play } = useSoundFX();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const hour = new Date().getHours();
  
  const baseGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const moodGreetings: Record<string, string> = {
    focused: 'Stay Sharp',
    grind: 'Keep Hustling',
    chill: 'Enjoy the Flow',
    zen: 'Peaceful Mind',
    creative: 'Unleash Ideas'
  };
  const greeting = `${moodGreetings[userSettings.mood || 'focused']}, ${userSettings.name || 'Champion'}`;

  const handleSearchClick = () => {
    play('click');
    // Trigger the Ctrl+K event manually
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <>
      <header className="h-20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 backdrop-blur-xl bg-[#0f101c]/40 border-b border-white/5">
        <div className="flex items-center">
          {onToggleSidebar && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { play('click'); onToggleSidebar(); }}
              className="md:hidden mr-3.5 p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              <Menu size={18} />
            </motion.button>
          )}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
            <span className="text-xl">
              {hour < 12 ? '🌅' : hour < 18 ? '☀️' : '🌙'}
            </span>
            <h2 className="text-white font-bold text-sm md:text-lg tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              {greeting}
            </h2>
          </motion.div>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">
            System Status: <span className="text-emerald-500">Optimized</span>
          </p>
        </div>
      </div>

        <div className="flex items-center gap-6">
          {/* Mobile Search Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSearchClick}
            className="sm:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center"
          >
            <Search size={18} strokeWidth={1.5} />
          </motion.button>

          {/* Desktop Search Trigger */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearchClick}
            className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white/40 hover:bg-white/10 hover:border-violet-500/50 transition-all duration-300 w-40 md:w-64 group"
          >
            <Search size={14} className="group-hover:text-violet-400 transition-colors" />
            <span className="flex-1 text-left">Search everything...</span>
            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              <Command size={10} />
              <span>K</span>
            </div>
          </motion.button>

          <div className="flex items-center gap-2">
            <HeaderButton 
              icon={Bell} 
              onClick={() => { play('click'); setShowNotifications(true); }}
              badge={unreadCount > 0}
            />
            <HeaderButton 
              icon={SettingsIcon} 
              onClick={() => { play('click'); navigate('/settings'); }} 
            />
            
            <div className="h-8 w-[1px] bg-white/10 mx-2" />

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { play('click'); setShowProfile(true); }}
              className="flex items-center gap-3 pl-1 pr-1 sm:pr-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-[#0f101c] flex items-center justify-center overflow-hidden">
                   <User size={16} className="text-white group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-start pr-1">
                <span className="text-[10px] font-bold text-white/90 leading-none mb-0.5">{userSettings.name || 'Pro'}</span>
                <span className="text-[8px] font-bold text-violet-400/80 uppercase tracking-wider leading-none">Elite Member</span>
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      <ProfileOverlay open={showProfile} onClose={() => setShowProfile(false)} />
      <NotificationCenter open={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}

function HeaderButton({ icon: Icon, onClick, badge }: { icon: any, onClick: () => void, badge?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="p-2.5 rounded-xl text-white/40 hover:text-white transition-all relative"
    >
      <Icon size={20} strokeWidth={1.5} />
      {badge && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-violet-500 rounded-full border-2 border-[#0f101c] shadow-[0_0_12px_rgba(139,92,246,0.8)] animate-pulse" />
      )}
    </motion.button>
  );
}
