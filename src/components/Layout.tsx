import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import TopHeader from './TopHeader';
import InteractiveGrid from './InteractiveGrid';
import { useAppStore } from '../store/useAppStore';
import { useRipple } from '../hooks/useRipple';
import { useSoundFX, soundEngine } from '../hooks/useSoundFX';
import { useWeather } from '../hooks/useWeather';
import WeatherOverlay from './WeatherOverlay';
import SoundscapeMixer from './SoundscapeMixer';
import ProductivityPet from './ProductivityPet';
import { getProductivityScore, todayString } from '../lib/utils';
import { useReminderEngine } from '../hooks/useReminderEngine';
import NotificationCenter from './NotificationCenter';
import ReminderModal from './ReminderModal';
import ShortcutsHelp from './ShortcutsHelp';
import QuickLauncherModal from './QuickLauncherModal';
import { useShortcuts } from '../hooks/useShortcuts';

export default function Layout() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [remModalOpen, setRemModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  const { requestPermission } = useReminderEngine();
  const weather = useWeather();
  const location = useLocation();
  const { play } = useSoundFX();
  useRipple();
  useShortcuts();

  // Unlock audio on first interaction
  React.useEffect(() => {
    const unlock = () => {
      const ctx = soundEngine.getCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !cmdOpen && !remModalOpen) {
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cmdOpen, remModalOpen]);

  const { dailyActivity, userSettings } = useAppStore();

  const todayActivity = dailyActivity.find(a => a.date === todayString());
  const prodScore = getProductivityScore(
    todayActivity?.chaptersRead || 0,
    todayActivity?.problemsSolved || 0,
    todayActivity?.focusMinutes || 0
  );

  // Dynamic colors based on score and weather
  const getAuraColor = () => {
    if (weather.type === 'rainy') return 'bg-blue-900';
    if (weather.type === 'night') return 'bg-indigo-950';
    if (weather.type === 'sunny' && prodScore > 70) return 'bg-amber-500';
    
    if (prodScore > 80) return 'bg-emerald-500';
    if (prodScore > 50) return 'bg-violet-600';
    if (prodScore > 20) return 'bg-blue-600';
    return 'bg-purple-800';
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <InteractiveGrid />
      <WeatherOverlay type={weather.type} />
      <SoundscapeMixer />
      
      {/* Ambient background blobs - Now reactive */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className={`ambient-blob w-[500px] h-[500px] blur-[120px] rounded-full fixed top-[-10%] left-[-5%] ${getAuraColor()} pointer-events-none z-0`} 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -40, 0],
          y: [0, -60, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="ambient-blob w-[400px] h-[400px] blur-[100px] rounded-full fixed top-[40%] right-[-5%] bg-indigo-900 pointer-events-none z-0" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="ambient-blob w-[600px] h-[600px] blur-[150px] rounded-full fixed bottom-[-10%] left-[20%] bg-fuchsia-900 pointer-events-none z-0" 
      />
 
      <Sidebar />
 
      <main className="main-content flex flex-col min-h-screen relative z-10">
        <TopHeader />
        <div className="p-8 pt-4 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              transition={{ 
                duration: 0.3, 
                ease: [0.22, 1, 0.36, 1] 
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <QuickLauncherModal />
      <ReminderModal open={remModalOpen} onClose={() => setRemModalOpen(false)} />
      <ShortcutsHelp isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(15,16,28,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'white',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#8b5cf6', secondary: 'white' } },
        }}
      />

      {/* Ctrl+K hint */}
      <div className="fixed bottom-6 left-[260px] text-xs text-white/20 flex items-center gap-1.5 pointer-events-none z-40">
        <kbd className="border border-white/10 rounded px-1.5 py-0.5 text-white/30">Ctrl K</kbd>
        <span>Command palette</span>
      </div>

      <ProductivityPet />

      {/* Global Grain Texture - The 'Award Winning' secret sauce */}
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}

