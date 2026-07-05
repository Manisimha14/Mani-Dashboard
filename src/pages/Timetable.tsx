import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';
import { 
  Calendar, Clock, Plus, Trash2, CheckCircle2, Circle, 
  RotateCcw, Sparkles, AlertCircle, Compass, Zap, Repeat 
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { TimetableEvent } from '../types';

export default function Timetable() {
  const { 
    timetableEvents, 
    addTimetableEvent, 
    updateTimetableEvent, 
    deleteTimetableEvent,
    addXp,
    book,
    problems,
    focusSessions
  } = useAppStore();

  const { play } = useSoundFX();
  const [showAddModal, setShowAddModal] = useState(false);
  const hourScrollContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekends'>('none');
  const [category, setCategory] = useState<'focus' | 'reading' | 'leetcode' | 'health' | 'custom'>('custom');

  // Filter current day events
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDayOfWeek = useMemo(() => new Date().getDay(), []); // 0 = Sunday, 6 = Saturday

  const dailyEvents = useMemo(() => {
    return timetableEvents.filter(evt => {
      // 1. Same exact date
      if (evt.date === todayStr) return true;
      // 2. Daily recurrence
      if (evt.recurrence === 'daily') return true;
      // 3. Weekdays (Mon-Fri, 1-5)
      if (evt.recurrence === 'weekdays' && todayDayOfWeek >= 1 && todayDayOfWeek <= 5) return true;
      // 4. Weekends (Sat-Sun, 0 or 6)
      if (evt.recurrence === 'weekends' && (todayDayOfWeek === 0 || todayDayOfWeek === 6)) return true;
      return false;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetableEvents, todayStr, todayDayOfWeek]);

  // Orbit stats
  const completionStats = useMemo(() => {
    if (dailyEvents.length === 0) return { total: 0, completed: 0, percent: 0 };
    const completed = dailyEvents.filter(e => e.completed).length;
    return {
      total: dailyEvents.length,
      completed,
      percent: Math.round((completed / dailyEvents.length) * 100),
    };
  }, [dailyEvents]);

  // Sync historical factual logs (Focus sessions and book readings completed today)
  const syncFactualMissions = () => {
    let syncedCount = 0;
    
    // Sync reading
    const completedChaptersToday = book.chapters.filter(c => c.completed && c.dateCompleted === todayStr);
    completedChaptersToday.forEach(c => {
      const exists = timetableEvents.some(e => e.title.includes(c.title));
      if (!exists) {
        addTimetableEvent({
          title: `📖 Completed Reading: ${c.title}`,
          startTime: '10:00',
          endTime: '11:00',
          date: todayStr,
          recurrence: 'none',
          category: 'reading'
        });
        syncedCount++;
      }
    });

    // Sync coding
    const solvedToday = problems.filter(p => p.completed && p.date === todayStr);
    solvedToday.forEach(p => {
      const exists = timetableEvents.some(e => e.title.includes(p.name));
      if (!exists) {
        addTimetableEvent({
          title: `💻 Solved Code: ${p.name}`,
          startTime: '14:00',
          endTime: '15:00',
          date: todayStr,
          recurrence: 'none',
          category: 'leetcode'
        });
        syncedCount++;
      }
    });

    // Sync focus
    const focusToday = focusSessions.filter(s => s.completed && s.date === todayStr);
    focusToday.forEach((s, idx) => {
      const timeStr = s.startTime || '16:00';
      const exists = timetableEvents.some(e => e.title.includes(`Focus Session #${idx + 1}`));
      if (!exists) {
        addTimetableEvent({
          title: `⚡ Completed Focus Session #${idx + 1}`,
          startTime: timeStr,
          endTime: timeStr, // instant log block
          date: todayStr,
          recurrence: 'none',
          category: 'focus'
        });
        syncedCount++;
      }
    });

    if (syncedCount > 0) {
      play('success');
      toast.success(`Synced ${syncedCount} completed objectives onto today's Time Orbit! 🌟`);
    } else {
      toast.error("No unsynced achievements found for today.");
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Mission title is required');
      return;
    }

    addTimetableEvent({
      title: title.trim(),
      startTime,
      endTime,
      date: todayStr,
      recurrence,
      category
    });

    play('success');
    toast.success('Mission synced to your Time Orbit!');
    setTitle('');
    setShowAddModal(false);
  };

  const toggleEventComplete = (id: string, isCompleted: boolean) => {
    if (!isCompleted) {
      play('success');
      addXp(15, 'Missions', `Completed Timetable Mission: ${timetableEvents.find(e => e.id === id)?.title}`);
      toast.success('Objective Completed! +15 System XP earned! ⚡');
    } else {
      play('click');
    }
    updateTimetableEvent(id, { completed: !isCompleted });
  };

  // Scroll to current hour marker on mount
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (hourScrollContainerRef.current) {
      const targetElement = document.getElementById(`hour-row-${currentHour}`);
      if (targetElement) {
        hourScrollContainerRef.current.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  return (
    <div className="space-y-8 max-w-7xl pb-12 font-mono">
      {/* Rebranded Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-400">
            Mani OS • Mission Hub
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase mt-1">
            Time Orbit Planner
          </h1>
          <p className="text-xs text-white/40 mt-1 font-medium leading-relaxed">
            Beautifully visualize, synchronize, and track your daily objective timeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncFactualMissions}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/20 bg-violet-600/10 text-violet-400 hover:bg-violet-600/20 text-xs font-black uppercase tracking-wider transition-all"
          >
            <RotateCcw size={13} className="animate-spin-slow" />
            Sync Goals
          </button>
          <button
            onClick={() => { play('click'); setShowAddModal(true); }}
            className="btn-glow px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus size={13} />
            Add Mission
          </button>
        </div>
      </div>

      {/* Main Grid: Orbit Dial and Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Col 1: Time Orbit Radial HUD Dial */}
        <div className="col-span-1 glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden border-white/5">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          
          <div className="text-center mb-6">
            <span className="text-[10px] text-white/20 uppercase tracking-[0.25em] font-black">Orbit Tracking</span>
            <h3 className="text-sm font-bold text-white uppercase mt-1 tracking-wider">Completion Velocity</h3>
          </div>

          <div className="relative w-48 h-48 mx-auto my-4">
            {/* Heartbeat pulse glow rings */}
            <motion.div 
              animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.16, 0.08] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border border-cyan-500/30 blur-[2px]"
            />

            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
              <motion.circle 
                cx="50" cy="50" r="42" fill="none" 
                stroke="url(#orbitGradient)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - completionStats.percent / 100) }}
                transition={{ duration: 1.5, ease: "circOut" }}
                className="drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white tracking-tighter">{completionStats.percent}%</span>
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-black mt-0.5">Missions</span>
            </div>
          </div>

          <div className="mt-4 text-center space-y-1">
            <div className="text-xs text-white/50">
              Completed <span className="text-cyan-400 font-bold">{completionStats.completed}</span> of <span className="text-white/80">{completionStats.total}</span> objectives
            </div>
            {completionStats.percent === 100 && completionStats.total > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block animate-pulse">
                🔥 Orbit Target Cleared!
              </span>
            )}
          </div>
        </div>

        {/* Col 2 & 3: Interactive Visual Timeline Tracker */}
        <div className="col-span-1 lg:col-span-2 glass-card p-6 flex flex-col border-white/5 h-[600px] relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <span className="text-[10px] text-white/20 uppercase tracking-[0.25em] font-black">Daily Timetable</span>
              <h3 className="text-sm font-bold text-white uppercase mt-1 tracking-wider">Hourly Track</h3>
            </div>
            <div className="text-xs text-white/40 flex items-center gap-1.5">
              <Clock size={12} className="text-violet-400" />
              <span>Current: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Timeline scrolling grid */}
          <div 
            ref={hourScrollContainerRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative"
          >
            {Array.from({ length: 24 }).map((_, hourIndex) => {
              const hourStr = String(hourIndex).padStart(2, '0');
              const isCurrentHour = new Date().getHours() === hourIndex;

              // Find events starting in this hour
              const hourMissions = dailyEvents.filter(e => e.startTime.startsWith(hourStr));

              return (
                <div 
                  key={hourIndex} 
                  id={`hour-row-${hourIndex}`}
                  className={`flex gap-4 items-start py-2 border-b border-white/[0.02] last:border-0 relative ${
                    isCurrentHour ? 'bg-violet-500/[0.02] -mx-2 px-2 rounded-xl border-l border-violet-500/30' : ''
                  }`}
                >
                  {/* Time column */}
                  <div className="w-14 shrink-0 flex flex-col text-right">
                    <span className={`text-xs font-bold font-mono tracking-tight ${isCurrentHour ? 'text-violet-400 font-black' : 'text-white/30'}`}>
                      {hourStr}:00
                    </span>
                    {isCurrentHour && (
                      <span className="text-[8px] bg-violet-500/20 text-violet-400 px-1 py-0.5 rounded uppercase font-black tracking-widest mt-1 text-center shrink-0">
                        NOW
                      </span>
                    )}
                  </div>

                  {/* Mission block column */}
                  <div className="flex-1 space-y-2">
                    {hourMissions.length === 0 ? (
                      <div className="text-[10px] text-white/10 italic py-1 hover:text-white/20 transition-colors cursor-pointer select-none">
                        No scheduled missions...
                      </div>
                    ) : (
                      hourMissions.map(m => (
                        <div 
                          key={m.id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 relative group overflow-hidden ${
                            m.completed 
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-white/30' 
                              : 'bg-white/[0.01] border-white/5 text-white/80 hover:bg-white/[0.03] hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => toggleEventComplete(m.id, m.completed)}
                              className="text-white/40 hover:text-white transition-colors shrink-0"
                            >
                              {m.completed ? (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                              ) : (
                                <Circle size={16} className="text-white/20 hover:text-white/40" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <span className={`text-xs font-bold block truncate leading-normal ${m.completed ? 'line-through decoration-emerald-500/40 decoration-2' : ''}`}>
                                {m.title}
                              </span>
                              <span className="text-[9px] text-white/30 block mt-0.5">
                                ⏱ {m.startTime} - {m.endTime} 
                                {m.recurrence !== 'none' && (
                                  <span className="text-violet-400 ml-1.5 uppercase font-black tracking-wider flex-inline items-center gap-0.5 text-[8px]">
                                    • 🔁 {m.recurrence}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => { play('click'); deleteTimetableEvent(m.id); toast.success('Mission deleted'); }}
                            className="p-1 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete event"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Timetable Event Modal Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              className="absolute inset-0 bg-[#0a0b14]/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            />
            
            <motion.div 
              className="glass-card w-full max-w-md relative overflow-hidden bg-black/90 border-white/10"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
            >
              <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <Compass size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Schedule Mission</h3>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-0.5">Time Orbit Parameters</p>
                </div>
              </div>

              <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Objective Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Log gym session, study, sleep..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                  />
                </div>

                {/* Times Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Recurrence */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Recurrence Rule</label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono appearance-none bg-zinc-900"
                  >
                    <option value="none">Once Today</option>
                    <option value="daily">Daily Loop</option>
                    <option value="weekdays">Mon - Fri Loop</option>
                    <option value="weekends">Sat - Sun Loop</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Mission Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['focus', 'reading', 'leetcode', 'health', 'custom'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`py-2 text-[8px] font-black uppercase tracking-wider border rounded-lg transition-all ${
                          category === cat
                            ? 'bg-violet-500/20 border-violet-400 text-violet-400 font-bold'
                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-glow px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Sync Mission
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
