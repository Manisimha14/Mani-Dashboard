import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Command } from 'lucide-react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
  { keys: ['Ctrl', 'Shift', 'R'], desc: 'Quick Schedule Reminder' },
  { keys: ['G', 'D'], desc: 'Go to Dashboard' },
  { keys: ['G', 'F'], desc: 'Go to Focus Mode' },
  { keys: ['G', 'L'], desc: 'Go to LeetCode' },
  { keys: ['G', 'S'], desc: 'Go to Settings' },
  { keys: ['Esc'], desc: 'Close Modals / Clear Search' },
];

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0f101c]/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-full max-w-md relative overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <Keyboard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Keyboard System</h3>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Elite Shortcuts</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">{s.desc}</span>
                  <div className="flex gap-1.5">
                    {s.keys.map(k => (
                      <kbd key={k} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-black text-violet-400 min-w-[24px] text-center shadow-glow-sm">
                        {k === 'Command' ? <Command size={10} /> : k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white/[0.02] text-center border-t border-white/5">
              <p className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">Pro Tip: Master these for 2.5x productivity gains</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
