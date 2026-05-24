import React, { Suspense, lazy, useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Timer, Heart, Target, Menu, Plus, Sparkles, Bug } from 'lucide-react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import InteractiveGrid from './InteractiveGrid';
import { useAppStore } from '../store/useAppStore';
import { useRipple } from '../hooks/useRipple';
import { useSoundFX, soundEngine } from '../hooks/useSoundFX';
import { useWeather } from '../hooks/useWeather';
import { getProductivityScore, todayString } from '../lib/utils';
import { useReminderEngine } from '../hooks/useReminderEngine';
import { useShortcuts } from '../hooks/useShortcuts';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useAchievementsEngine } from '../hooks/useAchievementsEngine';
import { useExtensionSync } from '../hooks/useExtensionSync';
import { useIsMobile } from '../hooks/useIsMobile';
import { getAppVersion } from '../lib/appVersion';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAutoBackup } from '../hooks/useAutoBackup';

const CommandPalette = lazy(() => import('./CommandPalette'));
const WeatherOverlay = lazy(() => import('./WeatherOverlay'));
const SoundscapeMixer = lazy(() => import('./SoundscapeMixer'));
const ProductivityPet = lazy(() => import('./ProductivityPet'));
const ReminderModal = lazy(() => import('./ReminderModal'));
const ShortcutsHelp = lazy(() => import('./ShortcutsHelp'));
const QuickLauncherModal = lazy(() => import('./QuickLauncherModal'));
const CompanionTerminal = lazy(() => import('./analytics/CompanionTerminal'));
const Confetti = lazy(() => import('react-confetti'));
const BugReportModal = lazy(() => import('./BugReportModal'));

function MobileTabButton({ to, icon: Icon, label, isActive, onClick }: {
  to: string;
  icon: any;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-1 relative flex-1 gap-0.5 transition-all duration-300 ${
        isActive ? 'text-violet-400 font-bold scale-105' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <div className={`relative transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : ''}`}>
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className="text-[8px] font-black tracking-[0.15em] uppercase">{label}</span>
      
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="absolute -bottom-1 w-1 h-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

export default function Layout() {
  const isOnline = useNetworkStatus();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [remModalOpen, setRemModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  
  const { requestPermission } = useReminderEngine();
  const weather = useWeather();
  const location = useLocation();
  const { play } = useSoundFX();
  useRipple();
  useShortcuts();
  useRealtimeSync();
  useAchievementsEngine();
  useExtensionSync();
  useAutoBackup();

  // PWA installation prompt states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  React.useEffect(() => {
    // Check if running on iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // If closed permanently, never show again
    if (localStorage.getItem('pwa_installed_closed')) {
      setShowPWAInstall(false);
      return;
    }

    // Check if already installed / running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !localStorage.getItem('pwa_installed_closed')) {
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
    localStorage.setItem('pwa_installed_closed', 'true');
    if (isIOS) return;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPWAInstall(false);
  };

  const handleAlreadyInstalledClick = () => {
    play('success');
    localStorage.setItem('pwa_installed_closed', 'true');
    setShowPWAInstall(false);
  };

  const handlePWAClose = () => {
    play('click');
    localStorage.setItem('pwa_installed_closed', 'true');
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
      // Toggle console overlay on Ctrl + ` or Ctrl + \ or Alt + T (Desktop only)
      if (window.innerWidth < 1024) return;
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

  const handleToggleSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleCloseCmd = useCallback(() => setCmdOpen(false), []);
  const handleCloseRem = useCallback(() => setRemModalOpen(false), []);
  const handleCloseShortcuts = useCallback(() => setShortcutsOpen(false), []);
  const handleCloseTerminal = useCallback(() => setTerminalOpen(false), []);
  const handleCloseReport = useCallback(() => setReportOpen(false), []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Toggle report modal on Ctrl + Shift + B
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setReportOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dailyActivity = useAppStore(s => s.dailyActivity);
  const userSettings = useAppStore(s => s.userSettings);

  const todayActivity = React.useMemo(() => {
    return dailyActivity.find(a => a.date === todayString());
  }, [dailyActivity]);

  const prodScore = React.useMemo(() => {
    return getProductivityScore(
      todayActivity?.chaptersRead || 0,
      todayActivity?.problemsSolved || 0,
      todayActivity?.focusMinutes || 0
    );
  }, [todayActivity]);

  // Dynamic colors based on score and weather
  const auraColor = React.useMemo(() => {
    if (weather.type === 'rainy') return 'bg-blue-900';
    if (weather.type === 'night') return 'bg-indigo-950';
    if (weather.type === 'sunny' && prodScore > 70) return 'bg-amber-500';
    
    if (prodScore > 80) return 'bg-emerald-500';
    if (prodScore > 50) return 'bg-violet-600';
    if (prodScore > 20) return 'bg-blue-600';
    return 'bg-purple-800';
  }, [weather.type, prodScore]);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <InteractiveGrid />
      <Suspense fallback={null}>
        <WeatherOverlay type={weather.type} />
        <SoundscapeMixer />
      </Suspense>
      
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
            className={`ambient-blob w-[500px] h-[500px] blur-[120px] rounded-full fixed top-[-10%] left-[-5%] ${auraColor} pointer-events-none z-0`} 
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
          <div className={`ambient-blob w-[250px] h-[250px] blur-[80px] rounded-full fixed top-[-5%] left-[-10%] ${auraColor} pointer-events-none z-0 opacity-20`} />
          <div className="ambient-blob w-[200px] h-[200px] blur-[80px] rounded-full fixed top-[45%] right-[-15%] bg-indigo-950 pointer-events-none z-0 opacity-15" />
        </>
      )}
 
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
 
      <main className="main-content flex flex-col min-h-screen relative z-10">
        <TopHeader onToggleSidebar={handleToggleSidebar} />
        <div 
          className="p-4 md:p-8 pt-4 flex-1"
          style={{
            paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 24px)' : '32px'
          }}
        >
              <AnimatePresence mode="popLayout">
            <motion.div
              key={location.pathname}
              initial={{ 
                opacity: 0,
                scale: 0.97,
                y: 10
              }}
              animate={{ 
                opacity: 1,
                scale: 1,
                y: 0 
              }}
              exit={{ 
                opacity: 0,
                scale: 1.02,
                y: -10
              }}
              transition={{ 
                duration: 0.25,
                ease: [0.25, 1, 0.5, 1]
              }}
              style={{ 
                willChange: 'transform, opacity',
                transformOrigin: 'top center',
                width: '100%'
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {(cmdOpen || remModalOpen || shortcutsOpen) && (
        <Suspense fallback={null}>
          {cmdOpen && <CommandPalette open={cmdOpen} onClose={handleCloseCmd} />}
          <ReminderModal open={remModalOpen} onClose={handleCloseRem} />
          <ShortcutsHelp isOpen={shortcutsOpen} onClose={handleCloseShortcuts} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <QuickLauncherModal />
      </Suspense>

      <AnimatePresence>
        {terminalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={handleCloseTerminal}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-2xl bg-transparent"
              onClick={e => e.stopPropagation()}
            >
              <Suspense fallback={null}>
                <CompanionTerminal
                  onClose={handleCloseTerminal}
                />
              </Suspense>
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

      <Suspense fallback={null}>
        <ProductivityPet />
      </Suspense>



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
              <h4 className="text-xs font-black uppercase tracking-wider text-violet-400">MANI OS Mobile</h4>
              <p className="text-[11px] text-white/70 leading-normal mt-0.5">
                {isIOS 
                  ? 'Tap the Share button 📤 then "Add to Home Screen" ➕' 
                  : 'Install our App on your phone for a premium, native-grade experience!'}
              </p>
              <p className="text-[10px] text-white/30 font-mono mt-1">Version {getAppVersion()}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && (
                <>
                  <button
                    onClick={handleAlreadyInstalledClick}
                    className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold text-[9px] uppercase tracking-wider transition-all"
                  >
                    Already Installed
                  </button>
                  <button
                    onClick={handlePWAInstallClick}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all"
                  >
                    Install
                  </button>
                </>
              )}
              {isIOS && (
                <button
                  onClick={handleAlreadyInstalledClick}
                  className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold text-[9px] uppercase tracking-wider transition-all"
                >
                  Dismiss
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

      {/* Offline Mode Glass Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 left-0 right-0 z-[9999] h-10 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-md flex items-center justify-center gap-3 px-4 shadow-[0_4px_30px_rgba(245,158,11,0.05)]"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-amber-400">
              Offline Mode Active — Secure Local Vault Buffering Data
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bug FAB Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <button
          onClick={() => { play('click'); setReportOpen(true); }}
          className="w-12 h-12 rounded-full bg-violet-600/90 border border-violet-500/30 hover:bg-violet-600 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-violet-950/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all duration-300 pointer-events-auto animate-pulse-subtle"
          title="Report Issue (Ctrl+Shift+B)"
        >
          <Bug size={18} />
        </button>
      </div>

      <Suspense fallback={null}>
        {reportOpen && <BugReportModal isOpen={reportOpen} onClose={handleCloseReport} />}
      </Suspense>

      {/* Global Grain Texture - The 'Award Winning' secret sauce */}
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.08] mix-blend-overlay bg-noise" />
    </div>
  );
}
