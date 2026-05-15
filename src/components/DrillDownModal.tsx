import React from 'react';
import Modal from './Modal';
import { useAppStore } from '../store/useAppStore';
import { format, parseISO } from 'date-fns';
import { Timer, Code2, BookOpen, Target, Calendar } from 'lucide-react';
import { formatDuration } from '../lib/utils';
import { motion } from 'framer-motion';

interface Props {
  date: string | null;
  onClose: () => void;
}

export default function DrillDownModal({ date, onClose }: Props) {
  const { dailyActivity, focusSessions, problems, book } = useAppStore();
  
  if (!date) return null;

  const activity = dailyActivity.find(a => a.date === date);
  const daySessions = focusSessions.filter(s => s.date === date);
  const dayProblems = problems.filter(p => p.completed && p.date?.startsWith(date));
  
  return (
    <Modal open={!!date} onClose={onClose} title={`Activity on ${format(parseISO(date), 'MMMM d, yyyy')}`} maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Day Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <Timer className="mx-auto mb-2 text-violet-400" size={20} />
            <div className="text-xl font-bold text-white">{activity?.focusMinutes || 0}m</div>
            <div className="text-[10px] text-white/40 uppercase font-bold">Focus Time</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Code2 className="mx-auto mb-2 text-cyan-400" size={20} />
            <div className="text-xl font-bold text-white">{activity?.problemsSolved || 0}</div>
            <div className="text-[10px] text-white/40 uppercase font-bold">Problems</div>
          </div>
          <div className="glass-card p-4 text-center">
            <BookOpen className="mx-auto mb-2 text-emerald-400" size={20} />
            <div className="text-xl font-bold text-white">{activity?.chaptersRead || 0}</div>
            <div className="text-[10px] text-white/40 uppercase font-bold">Chapters</div>
          </div>
        </div>

        {/* Detailed Logs */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} /> Session Breakdown
          </h4>
          
          {daySessions.length === 0 && (
            <div className="text-center py-8 text-white/20 text-sm italic">No focus sessions recorded this day.</div>
          )}

          <div className="space-y-2">
            {daySessions.map((s, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={s.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.completed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="text-sm font-bold text-white">{s.taskName || 'Focus Session'}</div>
                    <div className="text-[10px] text-white/30">{format(parseISO(s.startTime), 'h:mm a')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white">{s.actualDuration || s.duration}m</div>
                  <div className="text-[9px] text-white/40 uppercase">{s.completed ? 'Success' : 'Incomplete'}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {problems.filter(p => p.date?.startsWith(date)).length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Code2 size={14} /> Problems Solved
            </h4>
            <div className="flex flex-wrap gap-2">
              {problems.filter(p => p.date?.startsWith(date)).map(p => (
                <div key={p.id} className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-200">
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
