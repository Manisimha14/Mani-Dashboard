import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import TopHeader from './TopHeader';
import { useAppStore } from '../store/useAppStore';
import { useSpotlightCursor } from '../hooks/useSpotlight';
import { useRipple } from '../hooks/useRipple';
import { useSoundFX } from '../hooks/useSoundFX';
import { useWeather } from '../hooks/useWeather';
import WeatherOverlay from './WeatherOverlay';
import Soundscape from './Soundscape';
import ProductivityPet from './ProductivityPet';
import { getProductivityScore, todayString } from '../lib/utils';
import { useReminderEngine } from '../hooks/useReminderEngine';
import NotificationCenter from './NotificationCenter';
import ReminderModal from './ReminderModal';

export default function Layout() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [remModalOpen, setRemModalOpen] = useState(false);
  
  const { requestPermission } = useReminderEngine();
  const weather = useWeather();
  const location = useLocation();
  const { play } = useSoundFX();

  useSpotlightCursor();
  useRipple();

  React.useEffect(() => {
    play('click', 0.1);
  }, [location.pathname, play]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setRemModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
      <WeatherOverlay type={weather.type} />
      <Soundscape type={weather.type} />
      
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

      <main className="main-content flex flex-col min-h-screen">
        <TopHeader />
        <div className="p-8 pt-4 flex-1">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.22, 1, 0.36, 1] 
            }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ReminderModal open={remModalOpen} onClose={() => setRemModalOpen(false)} />

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

