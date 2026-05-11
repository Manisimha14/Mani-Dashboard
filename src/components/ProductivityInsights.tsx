import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getProductivityScore } from '../lib/utils';

export default function ProductivityInsights() {
  const { dailyActivity, focusSessions, problems, book } = useAppStore();

  const insights = useMemo(() => {
    const last7Days = dailyActivity.slice(-7);
    if (last7Days.length === 0) return [];

    const results = [];
    const avgScore = last7Days.reduce((acc, curr) => {
      const score = getProductivityScore(curr.chaptersRead, curr.problemsSolved, curr.focusMinutes);
      return acc + score;
    }, 0) / last7Days.length;

    // Insight 1: Velocity
    if (avgScore > 70) {
      results.push({
        type: 'success',
        title: 'Peak Performance',
        description: 'You are operating in God Mode. Your momentum is 40% higher than average elite users.',
        icon: Sparkles,
        color: 'text-emerald-400',
      });
    } else if (avgScore < 30 && last7Days.length >= 3) {
      results.push({
        type: 'warning',
        title: 'Momentum Alert',
        description: 'Your productivity velocity has dipped. Try a 5-minute Pomodoro to break the friction.',
        icon: AlertCircle,
        color: 'text-orange-400',
      });
    }

    // Insight 2: Focus Patterns
    const recentFocus = focusSessions.slice(0, 5);
    const avgFocusDuration = recentFocus.reduce((acc, s) => acc + (s.actualDuration || 0), 0) / (recentFocus.length || 1);
    
    if (avgFocusDuration > 45) {
      results.push({
        type: 'info',
        title: 'Deep Work Master',
        description: 'Your average session length is ideal for flow states. Keep these blocks protected.',
        icon: Brain,
        color: 'text-violet-400',
      });
    }

    // Insight 3: Skill Diversity
    const totalChapters = last7Days.reduce((acc, d) => acc + d.chaptersRead, 0);
    const totalProblems = last7Days.reduce((acc, d) => acc + d.problemsSolved, 0);

    if (totalChapters > 0 && totalProblems === 0) {
      results.push({
        type: 'suggestion',
        title: 'Balance Needed',
        description: 'You are crushing your reading goals, but coding output is stagnant. Switch gears today?',
        icon: Lightbulb,
        color: 'text-blue-400',
      });
    }

    // Insight 4: Growth
    results.push({
      type: 'stat',
      title: 'Neural Growth',
      description: `Your brain has processed approximately ${totalChapters * 20 + totalProblems * 50} mins of active learning this week.`,
      icon: TrendingUp,
      color: 'text-fuchsia-400',
    });

    return results;
  }, [dailyActivity, focusSessions, problems, book]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-violet-400" />
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">System Insights</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-4 relative overflow-hidden group hover:border-violet-500/30 transition-colors"
          >
            <div className="flex gap-4 items-start relative z-10">
              <div className={`p-2 rounded-xl bg-white/5 ${insight.color}`}>
                <insight.icon size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
                  {insight.title}
                </h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
            
            {/* Background Accent */}
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 blur-3xl opacity-10 rounded-full bg-current ${insight.color}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
