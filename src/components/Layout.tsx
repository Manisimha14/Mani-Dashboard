import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useAchievementsEngine } from '../hooks/useAchievementsEngine';
import { useExtensionSync } from '../hooks/useExtensionSync';
import Confetti from 'react-confetti';
import CompanionTerminal from './analytics/CompanionTerminal';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Layout() {
  const isMobile = useIsMobile();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [remModalOpen, setRemModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { requestPermission } = useReminderEngine();
  const weather = useWeather();
  const location = useLocation();
  const { play } = useSoundFX();
  useRipple();
  useShortcuts();
  useRealtimeSync();
  useAchievementsEngine();
  useExtensionSync();

  // PWA installation prompt states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  React.useEffect(() => {
    // Check if running on iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if already installed / running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowPWAInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (ios && !standalone) {
      const iosPromptClosed = localStorage.getItem('ios_pwa_prompt_closed');
      if (!iosPromptClosed) {
        const t = setTimeout(() => setShowPWAInstall(true), 5000);
        return () => clearTimeout(t);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePWAInstallClick = async () => {
    play('click');
    if (isIOS) return;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowPWAInstall(false);
  };

  const handlePWAClose = () => {
    play('click');
    setShowPWAInstall(false);
    if (isIOS) {
      localStorage.setItem('ios_pwa_prompt_closed', 'true');
    }
  };

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

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Toggle console overlay on Ctrl + ` or Ctrl + \ or Alt + T
      if (
        (e.ctrlKey && e.key === '`') ||
        (e.ctrlKey && e.key === '\\') ||
        (e.altKey && e.key.toLowerCase() === 't')
      ) {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dailyActivity = useAppStore(s => s.dailyActivity);
  const userSettings = useAppStore(s => s.userSettings);
  const celebratingAchievement = useAppStore(s => s.celebratingAchievement);
  const setCelebratingAchievement = (ach: any) => useAppStore.setState({ celebratingAchievement: ach });

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
      {!isMobile ? (
        <>
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
        </>
      ) : (
        <>
          {/* Static lightweight ambient glow for mobile */}
          <div className={`ambient-blob w-[250px] h-[250px] blur-[80px] rounded-full fixed top-[-5%] left-[-10%] ${getAuraColor()} pointer-events-none z-0 opacity-20`} />
          <div className="ambient-blob w-[200px] h-[200px] blur-[80px] rounded-full fixed top-[45%] right-[-15%] bg-indigo-950 pointer-events-none z-0 opacity-15" />
        </>
      )}
 
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 
      <main className="main-content flex flex-col min-h-screen relative z-10">
        <TopHeader onToggleSidebar={() => setSidebarOpen(true)} />
        <div className="p-4 md:p-8 pt-4 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ 
                opacity: 0, 
                y: isMobile ? 8 : 12 
              }}
              animate={{ 
                opacity: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                y: isMobile ? -8 : -12 
              }}
              transition={{ 
                duration: isMobile ? 0.15 : 0.22, 
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

      <AnimatePresence>
        {terminalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setTerminalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-2xl bg-transparent"
              onClick={e => e.stopPropagation()}
            >
              <CompanionTerminal
                onClose={() => setTerminalOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div className="hidden md:flex fixed bottom-6 left-[260px] text-xs text-white/20 items-center gap-1.5 pointer-events-none z-40">
        <kbd className="border border-white/10 rounded px-1.5 py-0.5 text-white/30">Ctrl K</kbd>
        <span>Command palette</span>
      </div>

      {/* Global Terminal toggle hint */}
      <div className="hidden md:flex fixed bottom-6 left-[410px] text-xs text-white/20 items-center gap-1.5 pointer-events-none z-40">
        <kbd className="border border-white/10 rounded px-1.5 py-0.5 text-white/30">Ctrl `</kbd>
        <span>Command Console</span>
      </div>

      <ProductivityPet />

      {/* Confetti Celebration */}
      {celebratingAchievement && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={400}
        />
      )}

      {/* Achievement Unlocked Immersive Dialog */}
      <AnimatePresence>
        {celebratingAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-full max-w-md glass-card p-8 border border-amber-500/30 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-950/20 via-black/90 to-black/95"
            >
              {/* Decorative light beams */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_60%)]" />
              
              {/* Rotating background light shield */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-amber-500/10 rounded-full pointer-events-none"
              />

              <div className="relative space-y-6">
                {/* Big Glowing Trophy / Icon */}
                <motion.div
                  initial={{ rotate: -15, scale: 0.5 }}
                  animate={{ rotate: [0, -10, 10, 0], scale: 1 }}
                  transition={{ duration: 0.8, type: 'spring' }}
                  className="text-7xl drop-shadow-[0_0_35px_rgba(245,158,11,0.8)] filter"
                >
                  {celebratingAchievement.icon}
                </motion.div>

                <div>
                  <motion.div
                    initial={{ letterSpacing: '0.1em', opacity: 0 }}
                    animate={{ letterSpacing: '0.3em', opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] font-black uppercase text-amber-400 tracking-[0.3em]"
                  >
                    🏆 ACHIEVEMENT UNLOCKED 🏆
                  </motion.div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mt-1">
                    {celebratingAchievement.title}
                  </h2>
                </div>

                {/* Rarity Pill */}
                <div className="flex justify-center">
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-amber-500/20 border border-amber-500/40 text-amber-400">
                    {celebratingAchievement.rarity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-white/70 max-w-xs mx-auto leading-relaxed">
                  {celebratingAchievement.description}
                </p>

                {/* Nice meta note */}
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
                  Unlocked on {celebratingAchievement.unlockedAt}
                </div>

                {/* Action CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    play('click');
                    setCelebratingAchievement(null);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black uppercase tracking-widest text-xs hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-98 transition-all"
                >
                  CLAIM REWARD
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showPWAInstall && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-6 left-1/2 w-[90%] max-w-md glass-card z-50 p-4 border border-violet-500/20 bg-gradient-to-r from-violet-950/20 via-[#0e0f17]/95 to-[#0e0f17]/98 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(139,92,246,0.15)] flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] p-2.5 flex-shrink-0">
              <img src="/favicon.svg" alt="App Logo" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-violet-400">Aura OS Mobile</h4>
              <p className="text-[11px] text-white/70 leading-normal mt-0.5">
                {isIOS 
                  ? 'Tap the Share button 📤 then "Add to Home Screen" ➕' 
                  : 'Install our App on your phone for a premium, native-grade experience!'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && (
                <button
                  onClick={handlePWAInstallClick}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-2xs uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all"
                >
                  Install
                </button>
              )}
              <button
                onClick={handlePWAClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Grain Texture - The 'Award Winning' secret sauce */}
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.08] mix-blend-overlay bg-noise" />
    </div>
  );
}

