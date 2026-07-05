import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';
import { 
  Calendar, Clock, Plus, Trash2, CheckCircle2, Circle, 
  RotateCcw, Sparkles, AlertCircle, Compass, Zap, Repeat,
  ChevronRight, CalendarDays, Moon, Sun, Sunrise, Play, Edit, Trash
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { TimetableEvent } from '../types';

export default function TodayFlow() {
  const { 
    timetableEvents, 
    addTimetableEvent, 
    updateTimetableEvent, 
    deleteTimetableEvent,
    addXp,
    book,
    problems,
    focusSessions,
    userSettings
  } = useAppStore();

  const { play } = useSoundFX();
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = today, -1 = yesterday, etc.
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekends'>('none');
  const [category, setCategory] = useState<'focus' | 'reading' | 'leetcode' | 'health' | 'custom'>('custom');

  // Compute targeted date string
  const activeDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d.toISOString().split('T')[0];
  }, [selectedDayOffset]);

  const activeDayOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d.getDay(); // 0 = Sunday, 6 = Saturday
  }, [selectedDayOffset]);

  // Weekly strip calculations
  const weeklyStripDays = useMemo(() => {
    const days = [];
    const today = new Date();
    // Get start of week (Monday)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const offset = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate completion score for this day
      const dayEvts = timetableEvents.filter(evt => {
        if (evt.date === dateStr) return true;
        if (evt.recurrence === 'daily') return true;
        const dow = d.getDay();
        if (evt.recurrence === 'weekdays' && dow >= 1 && dow <= 5) return true;
        if (evt.recurrence === 'weekends' && (dow === 0 || dow === 6)) return true;
        return false;
      });

      const total = dayEvts.length;
      const completed = dayEvts.filter(e => e.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      days.push({
        label: d.toLocaleDateString([], { weekday: 'short' }),
        dateNum: d.getDate(),
        offset,
        completionPct: pct,
        isToday: offset === 0
      });
    }
    return days;
  }, [timetableEvents]);

  // Filters missions for the active page day view
  const activeMissions = useMemo(() => {
    return timetableEvents.filter(evt => {
      if (evt.date === activeDateStr) return true;
      if (evt.recurrence === 'daily') return true;
      if (evt.recurrence === 'weekdays' && activeDayOfWeek >= 1 && activeDayOfWeek <= 5) return true;
      if (evt.recurrence === 'weekends' && (activeDayOfWeek === 0 || activeDayOfWeek === 6)) return true;
      return false;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetableEvents, activeDateStr, activeDayOfWeek]);

  // Completion calculation
  const completionStats = useMemo(() => {
    if (activeMissions.length === 0) return { total: 0, completed: 0, percent: 0 };
    const completed = activeMissions.filter(e => e.completed).length;
    return {
      total: activeMissions.length,
      completed,
      percent: Math.round((completed / activeMissions.length) * 100),
    };
  }, [activeMissions]);

  // Hourly groupings
  const morningMissions = useMemo(() => activeMissions.filter(e => e.startTime < '12:00'), [activeMissions]);
  const afternoonMissions = useMemo(() => activeMissions.filter(e => e.startTime >= '12:00' && e.startTime < '17:00'), [activeMissions]);
  const eveningMissions = useMemo(() => activeMissions.filter(e => e.startTime >= '17:00'), [activeMissions]);

  // Next upcoming mission
  const nextMission = useMemo(() => {
    if (selectedDayOffset !== 0) return null;
    const nowStr = new Date().toTimeString().slice(0, 5); // "HH:MM"
    return activeMissions.find(m => !m.completed && m.startTime >= nowStr) || null;
  }, [activeMissions, selectedDayOffset]);

  const syncFactualGoals = () => {
    let syncedCount = 0;
    
    // Sync Reading
    const completedChapters = book.chapters.filter(c => c.completed && c.dateCompleted === activeDateStr);
    completedChapters.forEach(c => {
      const exists = timetableEvents.some(e => e.title.includes(c.title));
      if (!exists) {
        addTimetableEvent({
          title: `📖 Completed Reading: ${c.title}`,
          startTime: '10:00',
          endTime: '11:00',
          date: activeDateStr,
          recurrence: 'none',
          category: 'reading'
        });
        syncedCount++;
      }
    });

    // Sync Coding
    const solvedProblems = problems.filter(p => p.completed && p.date === activeDateStr);
    solvedProblems.forEach(p => {
      const exists = timetableEvents.some(e => e.title.includes(p.name));
      if (!exists) {
        addTimetableEvent({
          title: `💻 Solved Code: ${p.name}`,
          startTime: '14:00',
          endTime: '15:00',
          date: activeDateStr,
          recurrence: 'none',
          category: 'leetcode'
        });
        syncedCount++;
      }
    });

    // Sync Focus
    const focusToday = focusSessions.filter(s => s.completed && s.date === activeDateStr);
    focusToday.forEach((s, idx) => {
      const exists = timetableEvents.some(e => e.title.includes(`Focus Session #${idx + 1}`));
      if (!exists) {
        addTimetableEvent({
          title: `⚡ Focus Session #${idx + 1}`,
          startTime: s.startTime || '16:00',
          endTime: s.startTime || '16:00',
          date: activeDateStr,
          recurrence: 'none',
          category: 'focus'
        });
        syncedCount++;
      }
    });

    if (syncedCount > 0) {
      play('success');
      toast.success(`Automatically synced ${syncedCount} missions onto your Flow timeline! ⚡`);
    } else {
      toast.error('No unsynced goal completions detected for today.');
    }
  };

  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTimetableEvent({
      title: title.trim(),
      startTime,
      endTime,
      date: activeDateStr,
      recurrence,
      category
    });

    play('success');
    toast.success('Mission logged on timeline!');
    setTitle('');
    setShowAddModal(false);
  };

  const handleToggleComplete = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      play('success');
      addXp(15, 'Missions', 'Completed Flow timeline item');
      toast.success('Mission Complete! +15 System XP earned! 🏆');
    } else {
      play('click');
    }
    updateTimetableEvent(id, { completed: !currentlyCompleted });
  };

  const handleSnooze = (id: string, currentStart: string) => {
    play('click');
    const [h, m] = currentStart.split(':').map(Number);
    const newH = (h + 1) % 24;
    const newStart = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    updateTimetableEvent(id, { startTime: newStart });
    toast.success('Mission postponed by 1 hour.');
  };

  return (
    <div className="space-y-8 max-w-5xl pb-12 font-mono">
      {/* 🚀 Brand & Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-400">
            Mani OS • Today's Flow
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mt-1">
            {selectedDayOffset === 0 ? "Today's Timeline" : "Timeline Plan"}
          </h1>
          <p className="text-xs text-white/40 mt-1">
            {completionStats.total > 0 
              ? `${completionStats.completed}/${completionStats.total} missions complete (${completionStats.percent}%)`
              : "No missions scheduled. Complete your first mission to build intelligence."
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={syncFactualGoals}
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
            Schedule Mission
          </button>
        </div>
      </div>

      {/* 📅 Weekly Progress Strip */}
      <div className="grid grid-cols-7 gap-2">
        {weeklyStripDays.map(day => {
          const isSelected = selectedDayOffset === day.offset;
          return (
            <button
              key={day.dateNum}
              onClick={() => { play('click'); setSelectedDayOffset(day.offset); }}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-violet-600/15 border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'bg-white/[0.01] border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              }`}
            >
              <span className="text-[9px] uppercase font-black leading-none mb-1">{day.label}</span>
              <span className="text-base font-black tracking-tighter leading-none mb-1.5">{day.dateNum}</span>
              
              {/* Progress visual bar indicator */}
              <div className="w-8 h-1 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className={`h-full ${isSelected ? 'bg-violet-400' : 'bg-white/20'}`}
                  style={{ width: `${day.completionPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 🚀 Active Journey Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Col 1 & 2: Timeline Journey Cards */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Morning Flow */}
          <JourneySection 
            title="Morning Flow" 
            icon={<Sunrise size={14} className="text-amber-400" />} 
            missions={morningMissions}
            onToggle={handleToggleComplete}
            onSnooze={handleSnooze}
            onDelete={deleteTimetableEvent}
          />

          {/* 2. Afternoon Flow */}
          <JourneySection 
            title="Afternoon Flow" 
            icon={<Sun size={14} className="text-cyan-400" />} 
            missions={afternoonMissions}
            onToggle={handleToggleComplete}
            onSnooze={handleSnooze}
            onDelete={deleteTimetableEvent}
          />

          {/* 3. Evening Flow */}
          <JourneySection 
            title="Evening Flow" 
            icon={<Moon size={14} className="text-violet-400" />} 
            missions={eveningMissions}
            onToggle={handleToggleComplete}
            onSnooze={handleSnooze}
            onDelete={deleteTimetableEvent}
          />

          {activeMissions.length === 0 && (
            <div className="glass-card p-10 border-white/5 text-center">
              <AlertCircle size={24} className="text-white/20 mx-auto mb-3" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Your operating system is ready</h4>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">
                Complete your first mission to begin building personalized intelligence.
              </p>
            </div>
          )}
        </div>

        {/* Col 3: Side Panel HUD */}
        <div className="space-y-6">
          {/* Next Up Activity Hub */}
          {selectedDayOffset === 0 && nextMission && (
            <div className="glass-card p-5 border border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full uppercase font-black tracking-widest">
                NEXT MISSION
              </span>
              <h3 className="text-sm font-black text-white uppercase mt-3 truncate">{nextMission.title}</h3>
              <p className="text-xs text-white/40 mt-1 font-mono">⏱ Starts at {nextMission.startTime}</p>
              
              <button 
                onClick={() => handleToggleComplete(nextMission.id, nextMission.completed)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-wider hover:bg-cyan-400 transition-all"
              >
                <CheckCircle2 size={13} />
                Complete Mission
              </button>
            </div>
          )}

          {/* AI Gap Helper Suggestions */}
          <div className="glass-card p-5 border border-violet-500/10 bg-white/[0.01]">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-violet-400 animate-pulse" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mani AI Suggestions</h4>
            </div>
            
            {activeMissions.length < 3 ? (
              <p className="text-[10px] text-white/40 leading-relaxed font-mono">
                💡 Schedule is light today. Suggested slots:
                <span className="block text-violet-400 mt-1 font-bold">• 15:00 - LeetCode Coding Forge</span>
                <span className="block text-violet-400 mt-0.5 font-bold">• 21:00 - Book Chapters Reading</span>
              </p>
            ) : (
              <p className="text-[10px] text-white/40 leading-relaxed font-mono">
                💡 Timeline is balanced. Keep up the high velocity to earn bonus System XP multiplier targets today!
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Add Custom Timeline Event Dialog */}
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
              className="glass-card w-full max-w-md relative overflow-hidden bg-black/95 border-white/10"
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
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Add Mission</h3>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mt-0.5">Parameters</p>
                </div>
              </div>

              <form onSubmit={handleCreateMission} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Objective Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="E.g. Log Workout, Study chapter..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all font-mono"
                  />
                </div>

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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Recurrence Rule</label>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all font-mono bg-zinc-900"
                  >
                    <option value="none">Once Today</option>
                    <option value="daily">Daily Loop</option>
                    <option value="weekdays">Mon - Fri Loop</option>
                    <option value="weekends">Sat - Sun Loop</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Mission Category</label>
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
                    Schedule
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

// ─── Journey Group Section Helper ──────────────────────────────────────────────
interface JourneySectionProps {
  title: string;
  icon: React.ReactNode;
  missions: TimetableEvent[];
  onToggle: (id: string, completed: boolean) => void;
  onSnooze: (id: string, start: string) => void;
  onDelete: (id: string) => void;
}

function JourneySection({ title, icon, missions, onToggle, onSnooze, onDelete }: JourneySectionProps) {
  const { play } = useSoundFX();
  if (missions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        {icon}
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{title}</h3>
      </div>
      <div className="space-y-2">
        {missions.map(m => (
          <div 
            key={m.id}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 relative group overflow-hidden ${
              m.completed 
                ? 'bg-emerald-500/5 border-emerald-500/10 text-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]' 
                : 'bg-white/[0.01] border-white/5 text-white/80 hover:bg-white/[0.03] hover:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => onToggle(m.id, m.completed)}
                className="text-white/40 hover:text-white transition-colors shrink-0"
              >
                {m.completed ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <Circle size={18} className="text-white/20 hover:text-white/40" />
                )}
              </button>
              
              <div className="min-w-0">
                <span className={`text-sm font-bold block truncate leading-normal ${m.completed ? 'line-through decoration-emerald-500/40 decoration-2' : ''}`}>
                  {m.title}
                </span>
                <span className="text-[10px] text-white/30 font-mono block mt-0.5">
                  ⏱ {m.startTime} - {m.endTime}
                  {m.recurrence !== 'none' && (
                    <span className="text-violet-400 ml-1.5 uppercase font-black tracking-widest text-[8px] inline-flex items-center gap-0.5">
                      • 🔁 {m.recurrence}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
              {!m.completed && (
                <button
                  onClick={() => onSnooze(m.id, m.startTime)}
                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Postpone by 1 hour"
                >
                  Snooze
                </button>
              )}
              <button
                onClick={() => { play('click'); onDelete(m.id); toast.success('Mission deleted'); }}
                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Delete mission"
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
