import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Wifi, Shield } from 'lucide-react';

export default function GlobalStatusBar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[200] flex items-center justify-between px-4 pointer-events-none">
      {/* Top Edge Glow */}
      <div className="absolute inset-0 bg-violet-500/10 blur-[2px]" />
      
      {/* Flux Animation Line */}
      <motion.div 
        animate={{ 
          x: ['-100%', '100%'],
          opacity: [0, 1, 0]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 h-[1px] w-48 bg-gradient-to-r from-transparent via-violet-500 to-transparent"
      />
      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" 
          />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Vault Synced</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Activity size={10} className="text-violet-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">System Optimized</span>
        </div>
      </div>

      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-2">
          <Cpu size={10} className="text-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Latency 14ms</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={10} className="text-fuchsia-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Local Encryption Active</span>
        </div>
      </div>
    </div>
  );
}
