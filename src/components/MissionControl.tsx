import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Target, Rocket, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ActiveGoalConsole() {
  const { trackers, book, problems } = useAppStore();

  const activeGoals = [
    {
      id: 'reading',
      title: 'Reading Progress',
      subtitle: book.title,
      progress: Math.round((book.chapters.filter(c => c.completed).length / 51) * 100),
      icon: <Rocket size={14} className="text-violet-400" />,
      color: 'bg-violet-500',
    },
    {
      id: 'coding',
      title: 'LeetCode Mastery',
      subtitle: `${problems.filter(p => p.completed).length} Problems Solved`,
      progress: Math.min(100, Math.round((problems.filter(p => p.completed).length / 50) * 100)),
      icon: <Zap size={14} className="text-cyan-400" />,
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="glass-card p-6 border-white/5 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Today's Missions</h3>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-1">Live Objective Tracking</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          <Target size={16} className="text-white/20" />
        </div>
      </div>

      <div className="space-y-6">
        {activeGoals.map((goal, index) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/5">
                  {goal.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white/80">{goal.title}</h4>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-tight">{goal.subtitle}</p>
                </div>
              </div>
              <span className="text-xs font-black text-white/50">{goal.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className={`h-full ${goal.color} shadow-[0_0_10px_rgba(139,92,246,0.3)]`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Decorative Flux Line */}
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-violet-500/5 to-transparent skew-x-[-20deg] pointer-events-none" />
    </div>
  );
}
