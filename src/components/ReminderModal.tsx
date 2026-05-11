import React, { useState } from 'react';
import Modal from './Modal';
import { useAppStore } from '../store/useAppStore';
import { todayString, generateId } from '../lib/utils';
import { Calendar, Clock, Repeat, Tag, Sparkles } from 'lucide-react';
import type { ReminderRecurrence, ReminderCategory, ReminderType } from '../types/reminder';
import toast from 'react-hot-toast';
import { addHours, format, startOfHour, addDays, startOfWeek, nextSunday } from 'date-fns';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: ReminderCategory[] = ['reading', 'coding', 'focus', 'habit', 'goal', 'streak', 'system', 'custom'];
const RECURRENCES: ReminderRecurrence[] = ['none', 'daily', 'weekly', 'monthly', 'weekdays', 'weekends'];

export default function ReminderModal({ open, onClose }: ReminderModalProps) {
  const { addReminder } = useAppStore();
  const [form, setForm] = useState({
    title: '',
    message: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(addHours(startOfHour(new Date()), 1), 'HH:mm'),
    category: 'custom' as ReminderCategory,
    recurrence: 'none' as ReminderRecurrence,
    type: 'task' as ReminderType,
  });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    
    addReminder({
      title: form.title,
      message: form.message || `Reminder: ${form.title}`,
      category: form.category,
      type: form.type,
      scheduledAt,
      recurrence: form.recurrence,
      enabled: true,
      completed: false,
    });

    toast.success('Reminder scheduled! 🔔');
    onClose();
    setForm({
      title: '',
      message: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(addHours(startOfHour(new Date()), 1), 'HH:mm'),
      category: 'custom',
      recurrence: 'none',
      type: 'task',
    });
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'later':
        setForm(f => ({ ...f, time: format(addHours(now, 2), 'HH:mm') }));
        break;
      case 'tomorrow':
        setForm(f => ({ ...f, date: format(addDays(now, 1), 'yyyy-MM-dd'), time: '09:00' }));
        break;
      case 'weekdays':
        setForm(f => ({ ...f, recurrence: 'weekdays', time: '09:00' }));
        break;
      case 'sunday':
        setForm(f => ({ ...f, date: format(nextSunday(now), 'yyyy-MM-dd'), time: '10:00', recurrence: 'weekly' }));
        break;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Intelligence">
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Subject</label>
            <input 
              className="input-glass w-full px-4 py-3 text-sm font-medium"
              placeholder="What should I remind you about?"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Detailed Context (Optional)</label>
            <textarea 
              className="input-glass w-full px-4 py-3 text-sm min-h-[80px]"
              placeholder="Add some depth to this nudge..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Target Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="date"
                  className="input-glass w-full pl-10 pr-4 py-2.5 text-sm"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Precision Time</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="time"
                  className="input-glass w-full pl-10 pr-4 py-2.5 text-sm"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Recurrence</label>
              <div className="relative">
                <Repeat size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <select 
                  className="input-glass w-full pl-10 pr-4 py-2.5 text-sm appearance-none bg-transparent"
                  value={form.recurrence}
                  onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as any }))}
                >
                  {RECURRENCES.map(r => <option key={r} value={r} className="bg-[#1a1b2e]">{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-2">Classification</label>
              <div className="relative">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <select 
                  className="input-glass w-full pl-10 pr-4 py-2.5 text-sm appearance-none bg-transparent"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a1b2e]">{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div>
          <label className="text-[10px] text-white/20 uppercase font-black tracking-widest block mb-3">Intelligence Presets</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'later', label: 'Later Today', icon: '⏳' },
              { id: 'tomorrow', label: 'Tomorrow AM', icon: '☀️' },
              { id: 'weekdays', label: 'Weekdays 9AM', icon: '💼' },
              { id: 'sunday', label: 'Sunday Review', icon: '📝' },
            ].map(p => (
              <button 
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-[11px] font-bold text-white/60 flex items-center gap-2"
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleCreate}
          className="btn-glow w-full py-4 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          Initialize Reminder
        </button>
      </div>
    </Modal>
  );
}
