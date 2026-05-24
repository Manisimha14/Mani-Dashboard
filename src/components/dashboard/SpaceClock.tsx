import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Compass, ShieldAlert, Cpu } from 'lucide-react';

export default function SpaceClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format times nicely
  const timeString = useMemo(() => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }, [time]);

  const dateString = useMemo(() => {
    return time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }, [time]);

  // Derived progress statistics
  const dayProgress = useMemo(() => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const totalSecondsInDay = 24 * 60 * 60;
    const elapsedSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return Math.min(100, Math.round((elapsedSeconds / totalSecondsInDay) * 100));
  }, [time]);

  const yearProgress = useMemo(() => {
    const start = new Date(time.getFullYear(), 0, 1);
    const diff = time.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const totalDaysInYear = (time.getFullYear() % 4 === 0) ? 366 : 365;
    return Math.min(100, Number(((dayOfYear / totalDaysInYear) * 100).toFixed(1)));
  }, [time]);

  return (
    <div className="w-full glass-card p-6 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
      {/* HUD Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.02] via-transparent to-fuchsia-600/[0.02] pointer-events-none" />
      
      {/* Decorative Grid Lines */}
      <div className="absolute -top-12 -left-12 w-48 h-48 border border-white/[0.02] rounded-full pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 border border-white/[0.02] rounded-full pointer-events-none" />

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10">
        
        {/* Column 1: Massive Glowing Clock */}
        <div className="flex flex-col justify-center items-center lg:items-start lg:border-r lg:border-white/5 lg:pr-6 min-h-[120px]">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={12} className="text-violet-400" />
            <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Current Time</span>
          </div>
          <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-violet-200 tracking-tighter font-mono filter drop-shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            {timeString}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">MANI OS Sync Active</span>
          </div>
        </div>

        {/* Column 2: Astronomical / Local Calendar */}
        <div className="flex flex-col justify-center items-center lg:items-start lg:border-r lg:border-white/5 lg:pr-6 min-h-[120px]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={12} className="text-fuchsia-400" />
            <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Chronological Anchor</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase text-center lg:text-left">
            {dateString}
          </div>
          <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">
            UTC {time.getTimezoneOffset() > 0 ? '-' : '+'}{Math.abs(Math.floor(time.getTimezoneOffset() / 60))}:{(Math.abs(time.getTimezoneOffset() % 60)).toString().padStart(2, '0')} • {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </div>
        </div>

        {/* Column 3: Space Progress HUD */}
        <div className="space-y-4 min-h-[120px] flex flex-col justify-center">
          
          {/* Day Cycle progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
              <span className="text-white/40 flex items-center gap-1">
                <Compass size={10} className="text-cyan-400" />
                Diurnal Cycle
              </span>
              <span className="text-white font-mono">{dayProgress}% Complete</span>
            </div>
            <div className="h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dayProgress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          {/* Year Cycle progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
              <span className="text-white/40 flex items-center gap-1">
                <Cpu size={10} className="text-fuchsia-400" />
                Year {time.getFullYear()} Transit
              </span>
              <span className="text-white font-mono">{yearProgress}% Orbit</span>
            </div>
            <div className="h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${yearProgress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
