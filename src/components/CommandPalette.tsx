import React, { useEffect, useRef, useState, useMemo, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ArrowRight, Timer, BookOpen, Code2, BarChart3, 
  Trophy, Target, FileText, LayoutDashboard, Settings, Sparkles,
  Command, Terminal, Zap, Calendar, Droplets
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';
import { useAddWater } from '../hooks/useHealthQuery';
import toast from 'react-hot-toast';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: 'Navigation' | 'Resources' | 'Actions' | 'Trackers' | 'Achievements';
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { play } = useSoundFX();
  const { book, problems, trackers, achievements, userSettings, updateUserSettings } = useAppStore();
  const { mutate: addWater } = useAddWater();

  const commands = useMemo(() => {
    const items: CommandItem[] = [
      { id: 'dashboard', label: 'Dashboard', category: 'Navigation', icon: <LayoutDashboard size={14} />, action: () => navigate('/'), shortcut: 'G D' },
      { id: 'focus', label: 'Forest Mode', description: 'Start a focus session', category: 'Navigation', icon: <Timer size={14} />, action: () => navigate('/focus'), shortcut: 'G F' },
      { id: 'reading', label: 'Library', description: 'Your reading marathon', category: 'Navigation', icon: <BookOpen size={14} />, action: () => navigate('/reading'), shortcut: 'G R' },
      { id: 'leetcode', label: 'LeetCode', description: 'Log daily problems', category: 'Navigation', icon: <Code2 size={14} />, action: () => navigate('/leetcode'), shortcut: 'G L' },
      { id: 'trackers', label: 'Trackers', description: 'Goals & habits', category: 'Navigation', icon: <Target size={14} />, action: () => navigate('/trackers'), shortcut: 'G T' },
      { id: 'analytics', label: 'Analytics', description: 'Insights & trends', category: 'Navigation', icon: <BarChart3 size={14} />, action: () => navigate('/analytics'), shortcut: 'G A' },
      { id: 'achievements', label: 'Achievements', description: 'Unlocked badges', category: 'Navigation', icon: <Trophy size={14} />, action: () => navigate('/achievements'), shortcut: 'G V' },
      { id: 'settings', label: 'Settings', category: 'Actions', icon: <Settings size={14} />, action: () => navigate('/settings'), shortcut: 'G S' },
      { id: 'create-reminder', label: 'Schedule Intelligence', description: 'Create a smart reminder', category: 'Actions', icon: <Calendar size={14} />, action: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', ctrlKey: true, shiftKey: true })); } },
      { id: 'theme-toggle', label: 'Toggle Appearance', description: `Switch to ${userSettings.theme === 'dark_pro' ? 'OLED' : 'Pro Dark'}`, category: 'Actions', icon: <Zap size={14} />, action: () => updateUserSettings({ theme: userSettings.theme === 'dark_pro' ? 'oled' : 'dark_pro' }) },
      { id: 'quick-water', label: 'Log 250ml Water', description: 'Log 250ml water immediately', category: 'Actions', icon: <Droplets size={14} className="text-cyan-400" />, action: () => {
        addWater({
          amount: 250,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().split('T')[0]
        });
        play('success');
        toast.success('Logged 250ml Water! 💧');
      }, shortcut: 'W A' },
      
      // Dynamic: Books
      ...(book?.chapters.filter(c => c.status !== 'not_started').map(c => ({
        id: `chap-${c.id}`,
        label: c.title,
        description: `Chapter ${c.number} • Reading`,
        category: 'Resources' as const,
        icon: <BookOpen size={14} />,
        action: () => navigate('/reading')
      })) || []),
      
      // Dynamic: Problems
      ...problems.slice(0, 5).map(p => ({
        id: `prob-${p.id}`,
        label: p.name,
        description: `${p.difficulty} • LeetCode`,
        category: 'Resources' as const,
        icon: <Terminal size={14} />,
        action: () => navigate('/leetcode')
      })),
      
      // Dynamic: Achievements
      ...achievements.filter(a => a.unlocked).map(a => ({
        id: `ach-${a.id}`,
        label: a.title,
        category: 'Achievements' as const,
        icon: <Trophy size={14} />,
        action: () => navigate('/achievements')
      }))
    ];
    return items;
  }, [book, problems, achievements, userSettings, navigate, updateUserSettings, addWater, play]);

  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    if (!deferredQuery) return commands.filter(c => c.category === 'Navigation');
    const q = deferredQuery.toLowerCase();
    return commands.filter(c => 
      c.label.toLowerCase().includes(q) || 
      c.description?.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [commands, deferredQuery]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      play('whoosh');
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => (s + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => (s - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      filtered[selected]?.action();
      play('success');
      onClose();
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-[#0a0b14]/80 backdrop-blur-xl z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 z-[201] w-full max-w-2xl px-4"
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-45%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-45%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          >
            <div className="relative group p-[1px] rounded-2xl overflow-hidden">
              {/* World Class Spectrum Border */}
              <motion.div 
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_120deg,#8b5cf6_180deg,transparent_240deg,transparent_360deg)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              />

              <div className="glass-card overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] border-white/10 relative" style={{ background: 'rgba(10,11,20,0.96)' }}>
                {/* Elite Search Shimmer */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent animate-shimmer" />

              {/* Search input */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 relative">
                <Search size={20} className="text-violet-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Where can I take you today?"
                  className="flex-1 bg-transparent text-lg text-white placeholder-white/20 outline-none font-medium"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10">Esc to close</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[500px] overflow-y-auto p-3 custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="text-center py-20">
                    <Sparkles size={40} className="mx-auto text-white/5 mb-4" />
                    <div className="text-white/40 font-medium">No results found for \"{query}\"</div>
                    <div className="text-xs text-white/20 mt-2">Try searching for pages, chapters, or actions.</div>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                        {category}
                      </div>
                      <div className="space-y-1">
                        {items.map((cmd) => {
                          const isSelected = filtered[selected]?.id === cmd.id;
                          return (
                            <button
                              key={cmd.id}
                              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all relative group ${
                                isSelected
                                  ? 'bg-violet-600/20 border border-violet-500/30'
                                  : 'hover:bg-white/5 border border-transparent'
                              }`}
                              onClick={() => { cmd.action(); play('success'); onClose(); }}
                              onMouseEnter={() => setSelected(filtered.findIndex(f => f.id === cmd.id))}
                            >
                              <div className={`p-2 rounded-lg transition-colors ${
                                isSelected ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-white/5 text-white/40'
                              }`}>
                                {cmd.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                  {cmd.label}
                                  {isSelected && (
                                    <motion.span 
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded uppercase font-black"
                                    >
                                      Enter
                                    </motion.span>
                                  )}
                                </div>
                                {cmd.description && (
                                  <div className="text-xs text-white/30 truncate">{cmd.description}</div>
                                )}
                              </div>
                              {cmd.shortcut && (
                                <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                  {cmd.shortcut.split(' ').map(s => (
                                    <kbd key={s} className="min-w-[18px] text-[10px] h-5 flex items-center justify-center border border-white/20 rounded bg-white/5 text-white px-1 font-bold">
                                      {s}
                                    </kbd>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex gap-6 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2"><ArrowRight size={10} className="text-violet-500" /> ↑↓ navigate</span>
                  <span className="flex items-center gap-2"><ArrowRight size={10} className="text-violet-500" /> Enter to select</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-violet-400/60 font-black italic">
                    {new Date().getHours() > 22 ? "Go to sleep soon, legend." : 
                     new Date().getHours() < 6 ? "Early bird gets the focus." :
                     "Crushing it, one command at a time."}
                  </div>
                  <div className="h-4 w-[1px] bg-white/10" />
                  <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    <Terminal size={12} className="text-emerald-500" />
                    <span>Terminal v1.0</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
