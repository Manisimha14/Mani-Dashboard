import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Wifi, Shield } from 'lucide-react';

export default function GlobalStatusBar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-6 z-[200] flex items-center justify-between px-4 pointer-events-none">
      {/* Top Edge Glow */}
      <div className="absolute inset-0 bg-violet-500/5 blur-[4px]" />
      
      {/* Flux Animation Line */}
      <motion.div 
        animate={{ 
          x: ['-100%', '200%'],
          opacity: [0, 0.5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 h-[1px] w-64 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
      />
      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
          />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-500/60">Vault Synced</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Activity size={10} className="text-violet-400/40" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">System Optimized</span>
        </div>
      </div>
    </div>
  );
}
