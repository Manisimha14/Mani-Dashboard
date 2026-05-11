import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { 
  User, Shield, LogOut, Award, Zap, TrendingUp, X, 
  Target, Wind, Brain, Sparkles, Palette, Crown, Star, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppMood, AppTheme } from '../types';
import { THEMES } from '../lib/themes';

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
}

const MOODS: { id: AppMood; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'focused', label: 'Focused', icon: Target, color: 'text-violet-400', desc: 'Deep work mode active.' },
  { id: 'grind', label: 'Grinding', icon: Zap, color: 'text-amber-400', desc: 'Crushing tasks relentlessly.' },
  { id: 'chill', label: 'Chill', icon: Wind, color: 'text-cyan-400', desc: 'Passive progress only.' },
  { id: 'zen', label: 'Zen', icon: Brain, color: 'text-emerald-400', desc: 'Mindful productivity.' },
  { id: 'creative', label: 'Creative', icon: Sparkles, color: 'text-fuchsia-400', desc: 'Ideas flowing freely.' },
];

export default function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
  const { userSettings, updateUserSettings, readingStreak, codingStreak, focusStreak, dailyActivity } = useAppStore();
  const [view, setView] = React.useState<'settings' | 'showcase'>('settings');
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const totalStreak = Math.max(readingStreak.currentStreak, codingStreak.currentStreak, focusStreak.currentStreak);
  const currentMood = MOODS.find(m => m.id === userSettings.mood) || MOODS[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]"
          />
          
          <motion.div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="fixed top-6 right-6 bottom-6 w-[450px] z-[151] glass-card overflow-hidden border-white/10 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* View Switcher */}
            <div className="absolute top-6 left-6 flex gap-2 z-20">
              <button 
                onClick={() => setView('settings')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'settings' ? 'bg-white text-black' : 'bg-white/5 text-white/40 border border-white/5'}`}
              >
                Control
              </button>
              <button 
                onClick={() => setView('showcase')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'showcase' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-white/40 border border-white/5'}`}
              >
                Identity
              </button>
            </div>

            {/* Header / Hero */}
            <div className="relative h-48 flex-shrink-0">
              <div className={`absolute inset-0 transition-all duration-1000 ${view === 'showcase' ? 'bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 opacity-80' : 'bg-gradient-to-br from-violet-600/40 via-fuchsia-600/40 to-transparent opacity-100'}`} />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
              
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-all border border-white/10 z-10"
              >
                <X size={20} />
              </button>

              <div className="absolute bottom-[-40px] left-8 flex items-end gap-6">
                <motion.div 
                  layout
                  className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-[3px] shadow-2xl relative group"
                >
                  <div className="w-full h-full rounded-3xl bg-[#0a0b14] flex items-center justify-center overflow-hidden">
                    <User size={64} className="text-white/20" />
                    <motion.div 
                      className="absolute inset-0 bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  {totalStreak > 10 && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#0a0b14]">
                      <Crown size={20} className="text-white" />
                    </div>
                  )}
                </motion.div>
                <div className="pb-4">
                  <motion.h2 
                    layout
                    className="text-3xl font-black text-white tracking-tight"
                  >
                    {userSettings.name || 'Champion'}
                  </motion.h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-[10px] font-black text-violet-400 uppercase tracking-widest">
                      Rank: Elite
                    </div>
                    <div className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Vibe: {userSettings.mood}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex-1 overflow-y-auto no-scrollbar px-8 pt-16 pb-8">
              <AnimatePresence mode="wait">
                {view === 'settings' ? (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    {/* Mood Description */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-white/5 ${currentMood.color}`}>
                        <currentMood.icon size={24} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white/40 uppercase tracking-widest">Current Status</div>
                        <div className="text-sm font-medium text-white/80">{currentMood.desc}</div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={Flame} label="Active Streak" value={`${totalStreak} Days`} color="text-orange-400" />
                      <StatCard icon={Star} label="Skill Level" value="Level 42" color="text-amber-400" />
                    </div>

                    {/* Vibe Selector */}
                    <div>
                      <div className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mb-4">Shift Your Energy</div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {MOODS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => updateUserSettings({ mood: m.id })}
                            className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border w-24 ${
                              userSettings.mood === m.id 
                                ? 'bg-violet-600/20 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]' 
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            <m.icon size={20} className={userSettings.mood === m.id ? m.color : 'text-white/20'} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${userSettings.mood === m.id ? 'text-white' : 'text-white/40'}`}>
                              {m.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme Studio */}
                    <div>
                      <div className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mb-4">Visual Architecture</div>
                      <div className="grid grid-cols-1 gap-2">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => updateUserSettings({ theme: t.id as AppTheme })}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              userSettings.theme === t.id 
                                ? 'bg-white/10 border-white/20 text-white' 
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-2xl">{t.emoji}</span>
                              <div className="text-left">
                                <div className="text-sm font-bold">{t.name}</div>
                                <div className="text-[10px] font-medium opacity-50">{t.description}</div>
                              </div>
                            </div>
                            {userSettings.theme === t.id && (
                              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-2">
                      <ProfileLink icon={TrendingUp} label="Operational Intelligence" onClick={() => navigate('/analytics')} />
                      <ProfileLink icon={Palette} label="Design System Settings" onClick={() => navigate('/settings')} />
                      <ProfileLink icon={Shield} label="Core Security" onClick={() => navigate('/settings')} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="showcase"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-8">
                      <div className="text-[10px] text-violet-400 font-black uppercase tracking-[0.3em] mb-2">Verified Identity</div>
                      <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Operational Excellence Card</h3>
                    </div>

                    <div className="p-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                         <Crown size={60} />
                      </div>
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">Master Stats</div>
                      <div className="space-y-4">
                        <ShowcaseStat label="Neural Focus" value="842 hrs" progress={85} color="bg-emerald-500" />
                        <ShowcaseStat label="Code Logic" value="1,240 solved" progress={92} color="bg-cyan-500" />
                        <ShowcaseStat label="Knowledge Depth" value="51 chapters" progress={64} color="bg-violet-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">World Rank</div>
                        <div className="text-3xl font-black text-white">#422</div>
                        <div className="text-[10px] text-emerald-400 font-bold mt-1">↑ Top 0.1%</div>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Achievement</div>
                        <div className="text-3xl font-black text-white">48</div>
                        <div className="text-[10px] text-violet-400 font-bold mt-1">Unstoppable</div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-violet-600/10 border border-violet-500/20 text-center">
                       <div className="text-xs font-bold text-white/60 mb-3 italic">"Your momentum is the architecture of your destiny."</div>
                       <div className="flex justify-center gap-2">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500/40" />
                          ))}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-8 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <button 
                onClick={() => { onClose(); }}
                className="flex items-center gap-2 text-red-400/60 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <LogOut size={14} /> Terminate Session
              </button>
              <div className="text-[10px] text-white/10 font-black uppercase tracking-widest">Build v1.0.9 // Elite</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
      <div className={`p-2 rounded-lg bg-white/5 w-fit mb-3 group-hover:scale-110 transition-transform ${color}`}>
        <Icon size={18} />
      </div>
      <div className="text-[10px] text-white/30 uppercase font-black tracking-widest">{label}</div>
      <div className="text-xl font-black text-white mt-1">{value}</div>
    </div>
  );
}

function ProfileLink({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-white/10 transition-all group border border-transparent hover:border-white/5"
    >
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-white/5 text-white/40 group-hover:text-violet-400 transition-colors">
          <Icon size={20} />
        </div>
        <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{label}</span>
      </div>
      <motion.div 
        initial={{ x: -5, opacity: 0 }}
        whileHover={{ x: 0, opacity: 1 }}
        className="text-violet-500"
      >
        →
      </motion.div>
    </button>
  );
}

function ShowcaseStat({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-white italic">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={`absolute inset-y-0 left-0 ${color} rounded-full`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}



