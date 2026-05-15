import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Settings, Target, Book, Dumbbell, Code, CheckCircle, 
  ChevronRight, LayoutGrid, List, Search, Sparkles, Zap, 
  Brain, Clock, Shield, Palette, Layers, Info, Trash2, Edit3
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import Modal from '../components/Modal';
import type { Tracker, TrackerType } from '../types';
import type { ISODateString } from '../types/reminder';
import { generateId } from '../lib/utils';
import { format as dfnsFormat, parseISO as dfnsParseISO, isToday, startOfDay, subDays, eachDayOfInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { showUndoToast } from '../components/UndoToast';

const todayStr = new Date().toISOString().split('T')[0];

const TRACKER_TYPES: { id: TrackerType; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'progress', label: 'Progress', desc: 'Track progress towards a goal', icon: Target, color: 'text-violet-400' },
  { id: 'habit', label: 'Habit', desc: 'Build and track a habit', icon: Zap, color: 'text-amber-400' },
  { id: 'quantity', label: 'Quantity', desc: 'Track numbers & quantities', icon: Layers, color: 'text-cyan-400' },
  { id: 'time', label: 'Time', desc: 'Track time spent', icon: Clock, color: 'text-emerald-400' },
  { id: 'checklist', label: 'Checklist', desc: 'Track tasks checklist', icon: CheckCircle, color: 'text-blue-400' },
  { id: 'custom', label: 'Custom', desc: 'Fully custom tracker', icon: Settings, color: 'text-fuchsia-400' },
];

const PRESET_COLORS = ['#8b5cf6', '#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
const PRESET_ICONS = ['📚', '💻', '🏋️', '🧘', '💧', '🥗', '🧠', '💰', '🎹', '🎨'];

const TEMPLATES = [
  { title: '100 Days of Code', icon: '💻', type: 'progress' as const, target: 100, unit: 'days', color: '#06b6d4' },
  { title: 'Read 50 Books', icon: '📚', type: 'progress' as const, target: 50, unit: 'books', color: '#8b5cf6' },
  { title: '5AM Club', icon: '☀️', type: 'habit' as const, frequency: 'daily', color: '#f59e0b' },
  { title: 'Weekly Workout', icon: '🏋️', type: 'quantity' as const, unit: 'sessions', target: 4, color: '#ef4444' },
];

export default function Trackers() {
  const { 
    trackers, addTracker, deleteTracker, updateTracker, 
    addReminder, reminders, deleteReminder 
  } = useAppStore();
  
  const [showCreate, setShowCreate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const defaultForm = {
    title: '',
    description: '',
    icon: '📚',
    color: '#8b5cf6',
    type: 'progress' as TrackerType,
    target: 10,
    unit: 'items',
    frequency: 'daily',
    isPrivate: false,
    reminderEnabled: false,
    reminderTime: '09:00',
  };

  const [form, setForm] = useState(defaultForm);

  const resetForm = useCallback(() => {
    setForm(defaultForm);
    setStep(1);
    setIsEditing(false);
    setEditingId(null);
  }, []);

  const handleCreate = () => {
    if (!form.title) { toast.error('Title is required'); return; }
    
    const { frequency, isPrivate, reminderEnabled, reminderTime, ...topLevelFields } = form;
    const metadata = { 
      frequency: frequency as 'daily' | 'weekly', 
      isPrivate, 
      reminderEnabled, 
      reminderTime 
    };

    if (isEditing && editingId) {
      updateTracker(editingId, {
        ...topLevelFields,
        metadata
      });
      
      // Update or cleanup reminder
      const existingReminder = reminders.find(r => r.metadata?.type === 'system' && r.metadata?.source === `tracker-${editingId}`);
      if (form.reminderEnabled) {
        if (existingReminder) {
          // Update logic would go here, but for simplicity we'll just keep it or recreate
        } else {
          addReminder({
            title: `Mission: ${form.title}`,
            message: `Time to progress on your ${form.title} tracker! 🎯`,
            domain: 'task',
            scheduleType: 'recurring',
            status: 'active',
            scheduledAt: new Date(`${todayStr}T${form.reminderTime}`).toISOString() as ISODateString,
            recurrence: 'daily',
            enabled: true,
            completed: false,
            metadata: { type: 'system', source: `tracker-${editingId}` }
          });
        }
      } else if (existingReminder) {
        deleteReminder(existingReminder.id);
      }
      
      toast.success('Mission Updated! 🛠️');
    } else {
      const trackerId = generateId();
      addTracker({
        ...topLevelFields,
        id: trackerId,
        items: [],
        metadata
      });

      if (form.reminderEnabled) {
        addReminder({
          title: `Mission: ${form.title}`,
          message: `Time to progress on your ${form.title} tracker! 🎯`,
          domain: 'task',
          scheduleType: 'recurring',
          status: 'active',
          scheduledAt: new Date(`${todayStr}T${form.reminderTime}`).toISOString() as ISODateString,
          recurrence: 'daily',
          enabled: true,
          completed: false,
          metadata: { type: 'system', source: `tracker-${trackerId}` }
        });
      }
      toast.success('Mission Initialized! 🎯');
    }

    setShowCreate(false);
    resetForm();
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setForm({ ...defaultForm, ...tpl });
    setStep(1);
    setShowCreate(true);
  };

  const handleEditTracker = (tracker: Tracker) => {
    setForm({
      title: tracker.title,
      description: tracker.description || '',
      icon: tracker.icon,
      color: tracker.color,
      type: tracker.type,
      target: tracker.target || 10,
      unit: tracker.unit || 'items',
      frequency: tracker.metadata?.frequency || 'daily',
      isPrivate: tracker.metadata?.isPrivate || false,
      reminderEnabled: tracker.metadata?.reminderEnabled || false,
      reminderTime: tracker.metadata?.reminderTime || '09:00',
    });
    setIsEditing(true);
    setEditingId(tracker.id);
    setStep(1);
    setShowCreate(true);
  };

  const filteredTrackers = useMemo(() => {
    return trackers.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
  }, [trackers, query]);

  const totalEfficiency = useMemo(() => {
    if (trackers.length === 0) return 0;
    const percentages = trackers.map(t => {
      const target = t.target || 1;
      const completed = t.items.filter(i => i.status === 'completed').length;
      return Math.min(100, (completed / target) * 100);
    });
    return Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
  }, [trackers]);

  const targetsToday = useMemo(() => {
    return trackers.reduce((sum, t) => {
      return sum + t.items.filter(i => i.dateCompleted?.startsWith(todayStr)).length;
    }, 0);
  }, [trackers]);

  return (
    <div className="flex gap-8 max-w-7xl mx-auto pb-20">
      {/* Left Column: List */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Trackers</h1>
            <p className="text-white/40 text-sm mt-1">Track anything that matters to you.</p>
          </div>
          <button 
            onClick={() => { setForm({ ...form, title: '' }); setStep(1); setShowCreate(true); }} 
            className="btn-glow px-4 py-2.5 flex items-center gap-2 text-sm font-black uppercase tracking-widest"
          >
            <Plus size={16} /> New Tracker
          </button>
        </div>

        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-violet-400 transition-colors" />
          <input 
            className="input-glass w-full pl-12 pr-4 py-3.5 text-sm font-medium"
            placeholder="Search anything..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredTrackers.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="glass-card-hover p-6 border border-white/5 relative group cursor-pointer overflow-hidden"
                onClick={() => setSelectedId(t.id)}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Target size={80} />
                </div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-glow-sm" style={{ backgroundColor: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}>
                    {t.icon}
                  </div>
                  <div className="flex gap-2">
                    <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                      {t.type}
                    </div>
                    {t.metadata?.reminderEnabled && (
                      <div className="w-6 h-6 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <Clock size={10} />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors truncate">{t.title}</h3>
                <p className="text-xs text-white/30 font-medium mb-6 line-clamp-1">{t.description || 'No description provided.'}</p>
                
                {t.type === 'progress' && t.target && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Efficiency</span>
                      <span className="text-sm font-black text-white italic font-intel">
                        {Math.min(100, Math.round((t.items.filter(i => i.status === 'completed').length / t.target) * 100))}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (t.items.filter(i => i.status === 'completed').length / t.target) * 100)}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                    </div>
                    <div className="text-[9px] text-white/20 font-bold uppercase tracking-tighter font-intel">
                      {t.items.filter(i => i.status === 'completed').length} / {t.target} {t.unit}
                    </div>
                  </div>
                )}

                {t.type === 'habit' && (
                   <div className="flex gap-1 mt-2 overflow-hidden">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const date = subDays(new Date(), 13 - i);
                        const dStr = date.toISOString().split('T')[0];
                        const isDone = t.items.some(item => item.dateCompleted?.startsWith(dStr));
                        return (
                          <div 
                            key={i} 
                            className={`h-4 flex-1 rounded-sm transition-all ${isDone ? '' : 'bg-white/5'}`} 
                            style={{ backgroundColor: isDone ? t.color : undefined, opacity: isDone ? (0.3 + (i / 14) * 0.7) : 1 }}
                          />
                        );
                      })}
                   </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Column: Intelligence & Templates */}
      <div className="w-80 space-y-8">
        {/* Mission Status */}
        <div className="glass-card p-6 border-violet-500/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-50" />
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Mission Efficiency</h3>
          </div>
          
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="58" className="stroke-white/5 fill-none" strokeWidth="8" />
              <motion.circle 
                cx="64" cy="64" r="58" 
                className="stroke-violet-500 fill-none" 
                strokeWidth="8" 
                strokeDasharray="364.4"
                initial={{ strokeDashoffset: 364.4 }}
                animate={{ strokeDashoffset: 364.4 * (1 - totalEfficiency / 100) }}
                transition={{ duration: 2, ease: "circOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white italic tracking-tighter font-intel">{totalEfficiency}%</span>
              <span className="text-[8px] font-bold text-violet-400 uppercase tracking-widest">
                {totalEfficiency > 80 ? 'Optimized' : totalEfficiency > 40 ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">Peak Performance</p>
            <p className="text-[9px] text-white/20 font-bold italic">{targetsToday} mission targets acquired today</p>
          </div>
        </div>

        {/* Popular Templates */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-white/20 mb-4 px-2">Popular Templates</h3>
          <div className="space-y-3">
            {TEMPLATES.map((tpl) => (
              <button 
                key={tpl.title}
                onClick={() => applyTemplate(tpl)}
                className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 text-left">
                  <span className="text-2xl group-hover:translate-y-[-2px] transition-transform">{tpl.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors">{tpl.title}</div>
                    <div className="text-[10px] text-white/20 uppercase font-black">{tpl.type}</div>
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-white/5 text-[8px] font-black uppercase text-white/30 group-hover:text-white transition-colors border border-transparent group-hover:border-white/10">Use</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal: Multi-step */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title={isEditing ? 'Edit Tracker' : 'Create New Tracker'}>
        <div className="space-y-8">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-4">
             {[1, 2, 3, 4].map((s) => (
               <React.Fragment key={s}>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= s ? 'bg-violet-500 text-white shadow-glow-sm' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                   {s}
                 </div>
                 {s < 4 && <div className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-violet-500' : 'bg-white/5'}`} />}
               </React.Fragment>
             ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">The Foundation</h3>
                  <p className="text-xs text-white/40">Give your mission a name and a visual identity.</p>
                </div>
                <div>
                  <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Title</label>
                  <input className="input-glass w-full px-4 py-3 text-sm font-bold" placeholder="e.g. 100 Days of Code" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Icon (Emoji)</label>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_ICONS.map(i => (
                      <button key={i} onClick={() => setForm({ ...form, icon: i })} className={`p-3 rounded-xl transition-all text-xl ${form.icon === i ? 'bg-violet-500 shadow-glow-sm' : 'bg-white/5 hover:bg-white/10'}`}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Theme Color</label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-10 h-10 rounded-xl transition-all border-2 ${form.color === c ? 'border-white ring-2 ring-violet-500/50' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="btn-glow w-full py-4 text-sm font-black uppercase tracking-[0.2em] mt-4">Next: Strategy</button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Tracker Type</h3>
                  <p className="text-xs text-white/40">How should we measure your excellence?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   {TRACKER_TYPES.map((t) => (
                     <button
                       key={t.id}
                       onClick={() => setForm({ ...form, type: t.id })}
                       className={`p-4 rounded-2xl border text-left transition-all ${form.type === t.id ? 'bg-violet-600/20 border-violet-500 shadow-glow-sm' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                       <t.icon size={20} className={`mb-3 ${t.color}`} />
                       <div className="text-sm font-bold text-white">{t.label}</div>
                       <div className="text-[10px] text-white/40 leading-tight mt-1">{t.desc}</div>
                     </button>
                   ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest border border-white/5">Back</button>
                  <button onClick={() => setStep(3)} className="flex-[2] btn-glow py-4 text-sm font-black uppercase tracking-[0.2em]">Next: Configuration</button>
                </div>
              </motion.div>
            ) : step === 3 ? (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Configuration</h3>
                  <p className="text-xs text-white/40">Define targets and advanced behaviors.</p>
                </div>
                
                {form.type === 'progress' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Target Goal</label>
                      <input type="number" className="input-glass w-full px-4 py-3 text-sm font-bold" value={form.target} onChange={e => setForm({ ...form, target: +e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Unit</label>
                      <input className="input-glass w-full px-4 py-3 text-sm font-bold" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/60">
                      <Shield size={16} />
                      <span className="text-xs font-bold italic">Private Tracker</span>
                    </div>
                    <button onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })} className={`w-10 h-5 rounded-full transition-all relative ${form.isPrivate ? 'bg-violet-500' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${form.isPrivate ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest border border-white/5">Back</button>
                  <button onClick={() => setStep(4)} className="flex-[2] btn-glow py-4 text-sm font-black uppercase tracking-[0.2em]">Next: Intelligence</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">System Intelligence</h3>
                  <p className="text-xs text-white/40">Automate your reminders and nudges.</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/80">
                      <Clock size={18} className="text-violet-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest">Active Nudges</span>
                        <span className="text-[10px] text-white/30 font-medium">Daily system reminders</span>
                      </div>
                    </div>
                    <button onClick={() => setForm({ ...form, reminderEnabled: !form.reminderEnabled })} className={`w-12 h-6 rounded-full transition-all relative ${form.reminderEnabled ? 'bg-violet-500 shadow-glow-sm' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.reminderEnabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {form.reminderEnabled && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                        <div>
                          <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Preferred Trigger Time</label>
                          <input type="time" className="input-glass w-full px-4 py-3 text-sm font-bold" value={form.reminderTime} onChange={e => setForm({ ...form, reminderTime: e.target.value })} />
                        </div>
                        <p className="text-[10px] text-white/20 italic leading-relaxed">
                          The system will initialize a daily mission alert at this time to maintain your momentum.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest border border-white/5">Back</button>
                  <button onClick={handleCreate} className="flex-[2] btn-glow py-4 text-sm font-black uppercase tracking-[0.2em]">Initialize Operational Intel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>

      {/* Tracker Detail Modal */}
      {trackers.find(t => t.id === selectedId) && (
        <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title={trackers.find(t => t.id === selectedId)?.title || ''}>
          <TrackerDetail 
            tracker={trackers.find(t => t.id === selectedId)!} 
            onClose={() => setSelectedId(null)} 
            onEdit={() => {
              const tracker = trackers.find(t => t.id === selectedId)!;
              setSelectedId(null);
              handleEditTracker(tracker);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TrackerDetail({ tracker, onClose, onEdit }: { tracker: Tracker; onClose: () => void; onEdit: () => void }) {
  const { deleteTracker, updateTracker, reminders, deleteReminder } = useAppStore();
  const [logValue, setLogValue] = useState<string>('');
  const [logNote, setLogNote] = useState<string>('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5 p-5 glass-card relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <Zap size={60} />
        </div>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-glow-sm" style={{ backgroundColor: `${tracker.color}20`, color: tracker.color, border: `1px solid ${tracker.color}40` }}>
          {tracker.icon}
        </div>
        <div className="flex-1">
          <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 inline-block">
            {tracker.type}
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{tracker.title}</h3>
          <p className="text-xs text-white/40 font-medium">{tracker.description || 'System tracking in progress...'}</p>
        </div>
        <button 
          onClick={onEdit}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Historical Logs</div>
        <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2">
           {tracker.items.length === 0 ? (
             <div className="text-center py-10 opacity-20 border-2 border-dashed border-white/10 rounded-2xl">
                <Info size={32} className="mx-auto mb-2" />
                <p className="text-xs font-bold italic">No data points logged yet.</p>
             </div>
           ) : (
             [...tracker.items].reverse().map(item => (
               <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {item.title}
                      {item.value !== undefined && <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px]">{item.value} {tracker.unit}</span>}
                    </div>
                    <div className="text-[10px] text-white/20 font-black uppercase tracking-tighter">
                      {item.dateCompleted ? dfnsFormat(dfnsParseISO(item.dateCompleted), 'MMM d, HH:mm') : 'Unknown date'}
                    </div>
                    {item.notes && <p className="text-xs text-white/40 mt-1 italic">{item.notes}</p>}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                     <CheckCircle size={14} />
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      <AnimatePresence>
        {showLogForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/20 uppercase font-bold block mb-1">Entry Title</label>
                  <input className="input-glass w-full px-3 py-2 text-xs" placeholder="What happened?" value={logNote} onChange={e => setLogNote(e.target.value)} />
                </div>
                {tracker.type === 'quantity' || tracker.type === 'progress' ? (
                  <div>
                    <label className="text-[9px] text-white/20 uppercase font-bold block mb-1">Value ({tracker.unit})</label>
                    <input type="number" className="input-glass w-full px-3 py-2 text-xs" value={logValue} onChange={e => setLogValue(e.target.value)} />
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    updateTracker(tracker.id, {
                      items: [...tracker.items, { 
                        id: generateId(), 
                        title: logNote || `Operational Entry #${tracker.items.length + 1}`, 
                        status: 'completed',
                        value: logValue ? Number(logValue) : undefined,
                        dateCompleted: new Date().toISOString() 
                      }]
                    });
                    setLogValue('');
                    setLogNote('');
                    setShowLogForm(false);
                    toast.success('Progress Logged! 📈');
                  }}
                  className="btn-glow flex-1 py-2 text-xs font-bold uppercase"
                >
                  Confirm Log
                </button>
                <button onClick={() => setShowLogForm(false)} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
        {confirmDelete ? (
          <div className="col-span-2 flex items-center gap-3 bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
            <span className="text-xs font-bold text-red-400 flex-1">Permanently terminate this mission?</span>
            <button 
              onClick={() => {
                deleteTracker(tracker.id);
                // Cleanup reminder
                const reminder = reminders.find(r => r.metadata?.type === 'system' && r.metadata?.source === `tracker-${tracker.id}`);
                if (reminder) deleteReminder(reminder.id);
                onClose();
                toast.success('Tracker Deleted');
              }}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black uppercase"
            >
              Yes, Terminate
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-white/40 hover:text-white text-xs font-bold">Cancel</button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => setShowLogForm(true)}
              className="btn-glow py-4 text-sm font-black uppercase tracking-widest"
            >
              + Log Progress
            </button>
            <button 
              onClick={() => setConfirmDelete(true)}
              className="py-4 rounded-2xl bg-white/5 border border-white/5 text-white/20 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

