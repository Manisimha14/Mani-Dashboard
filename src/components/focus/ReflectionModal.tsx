import React, { useState, useMemo } from 'react';
import Modal from '../Modal';
import { toast } from 'react-hot-toast';
import { useUpdateFocusSession } from '../../hooks/useFocusQuery';
import { useAppStore } from '../../store/useAppStore';

interface ReflectionModalProps {
  open: boolean;
  onClose: () => void;
  lastCompletedSessionId: string | null;
  setLastCompletedSessionId: (id: string | null) => void;
}

export const ReflectionModal = React.memo(function ReflectionModal({
  open,
  onClose,
  lastCompletedSessionId,
  setLastCompletedSessionId,
}: ReflectionModalProps) {
  const pomodoroSettings = useAppStore((s) => s.pomodoroSettings);
  const updateFocusSessionMutation = useUpdateFocusSession();

  // Local-only fields to prevent parent rerenders
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [quantities, setQuantities] = useState({
    problemsSolved: 0,
    minutesOfLearning: 0,
    pagesRead: 0,
    featuresShipped: 0,
    notesCreated: 0,
    exercisesCompleted: 0,
  });
  const [sessionQuality, setSessionQuality] = useState<string>('Average');

  const computedSessionScore = useMemo(() => {
    let score = 25; // completed focus session gets +25
    if (pomodoroSettings.focusDuration >= 45) score += 20;

    const hasCoding = quantities.problemsSolved > 0 || quantities.featuresShipped > 0 || selectedActivities.includes('Solved coding problems');
    if (hasCoding) score += 15;

    const hasLearning = quantities.minutesOfLearning > 0 || quantities.notesCreated > 0 || selectedActivities.includes('Studied concepts') || selectedActivities.includes('Learning') || selectedActivities.includes('Read documentation');
    if (hasLearning) score += 10;

    const hasProject = quantities.featuresShipped > 0 || selectedActivities.includes('Built project feature') || selectedActivities.includes('Debugged issue');
    if (hasProject) score += 15;

    score += 15; // Reflection submitted bonus

    if (sessionQuality === 'Locked in') score += 10;
    else if (sessionQuality === 'Deep work') score += 10;
    else if (sessionQuality === 'Distracted' || sessionQuality === 'Interrupted') score -= 15;
    else if (sessionQuality === 'Low energy') score -= 5;

    return Math.max(10, Math.min(100, score));
  }, [pomodoroSettings.focusDuration, selectedActivities, quantities, sessionQuality]);

  const handleSubmit = () => {
    if (lastCompletedSessionId) {
      updateFocusSessionMutation.mutate({
        id: lastCompletedSessionId,
        updates: {
          reflection: JSON.stringify({
            activities: selectedActivities,
            quantities,
            quality: sessionQuality,
          }),
          productivityScore: computedSessionScore,
        },
      });
    }
    setLastCompletedSessionId(null);
    setSelectedActivities([]);
    setQuantities({
      problemsSolved: 0,
      minutesOfLearning: 0,
      pagesRead: 0,
      featuresShipped: 0,
      notesCreated: 0,
      exercisesCompleted: 0,
    });
    setSessionQuality('Average');
    onClose();
    toast.success(`⚡ Session Productivity Score: ${computedSessionScore}!`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Reflect on your Sprint" maxWidth="max-w-xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Progress Timeline Header */}
        <div className="space-y-2">
          <div className="flex justify-between text-[8px] uppercase tracking-wider font-black text-white/30 relative z-10">
            <span>Started</span>
            <span>Deep Focus</span>
            <span>Completed</span>
          </div>
        </div>

        {/* Activities Multi-select */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 block">What did you do during this session?</label>
          <div className="flex flex-wrap gap-2">
            {[
              'Solved coding problems', 'Watched educational video', 'Built project feature',
              'Debugged issue', 'Studied concepts', 'Read documentation', 'Reading',
              'Research', 'Planning', 'Writing', 'Revision', 'Learning'
            ].map((act) => {
              const isSelected = selectedActivities.includes(act);
              return (
                <button
                  key={act}
                  onClick={() => {
                    setSelectedActivities((prev) =>
                      isSelected ? prev.filter((a) => a !== act) : [...prev, act]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-violet-500/10 border-violet-500/30 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {act}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantify Output fields */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 block">Quantify your outputs</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Problems Solved', key: 'problemsSolved' },
              { label: 'Minutes of Learning', key: 'minutesOfLearning' },
              { label: 'Pages Read', key: 'pagesRead' },
              { label: 'Features Shipped', key: 'featuresShipped' },
              { label: 'Notes Created', key: 'notesCreated' },
              { label: 'Exercises Completed', key: 'exercisesCompleted' }
            ].map((f) => (
              <div key={f.key} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{f.label}</span>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setQuantities((q) => ({ ...q, [f.key]: Math.max(0, (q as any)[f.key] - 1) }))}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="font-mono text-base font-black text-white">{(quantities as any)[f.key]}</span>
                  <button
                    onClick={() => setQuantities((q) => ({ ...q, [f.key]: (q as any)[f.key] + 1 }))}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Quality inputs */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black tracking-widest text-white/40 block">Session Quality</label>
          <div className="flex flex-wrap gap-2">
            {['Locked in', 'Deep work', 'Average', 'Distracted', 'Interrupted', 'Low energy'].map((q) => {
              const isSelected = sessionQuality === q;
              const colors: Record<string, string> = {
                'Locked in': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                'Deep work': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                'Average': 'bg-violet-500/10 border-violet-500/30 text-violet-400',
                'Distracted': 'bg-red-500/10 border-red-500/30 text-red-400',
                'Interrupted': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                'Low energy': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              };
              return (
                <button
                  key={q}
                  onClick={() => setSessionQuality(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? colors[q] || 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamically Computed Score Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-600/10 to-indigo-600/5 border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Computed Session Quality</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black text-white italic">{computedSessionScore}</span>
              <span className="text-white/20 text-sm font-bold">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] uppercase tracking-[0.2em] font-black text-violet-400">Score Rule breakdown</span>
            <div className="text-[10px] text-white/40 font-bold mt-1">
              +25 Session • +15 Ref • {pomodoroSettings.focusDuration >= 45 ? '+20 Deep' : '+0 Dur'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-white/5 flex justify-end">
        <button
          onClick={handleSubmit}
          className="btn-glow px-6 py-3 text-xs font-black uppercase tracking-wider"
        >
          Complete Reflection &amp; Submit Score →
        </button>
      </div>
    </Modal>
  );
});
