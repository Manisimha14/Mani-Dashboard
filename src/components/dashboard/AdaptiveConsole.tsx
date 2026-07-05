/**
 * AdaptiveConsole — "🧠 Adaptive Intelligence" Dashboard Widget
 *
 * Surfaces context-aware predicted actions based on time of day, recent
 * activity, and streak momentum. Rendered as a glass-card with a
 * horizontally scrollable row of action cards.
 *
 * Recovery mode: if it's past 14:00 and nothing has been logged today,
 * the widget shows a friendly "Catch up in one tap" consolidated action.
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  generatePredictions,
  getContextGreeting,
  type PredictedAction,
  type PredictionContext,
} from '../../services/ail/prediction.service';
import { useTodayHealthData } from '../../hooks/useHealthQuery';
import { useAddWater } from '../../hooks/useHealthQuery';
import { useAppStore } from '../../store/useAppStore';
import { useSoundFX } from '../../hooks/useSoundFX';
import { todayString } from '../../lib/utils';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PredictionCardProps {
  prediction: PredictedAction;
  index: number;
  onExecute: (p: PredictedAction) => void;
}

const PredictionCard = React.memo(function PredictionCard({
  prediction,
  index,
  onExecute,
}: PredictionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.35 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onExecute(prediction)}
      className="flex-shrink-0 w-44 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-left group cursor-pointer"
    >
      {/* Icon */}
      <div className="text-2xl mb-3">{prediction.icon}</div>

      {/* Label */}
      <div className="text-sm font-bold text-white mb-1 truncate group-hover:text-violet-300 transition-colors">
        {prediction.label}
      </div>

      {/* Description */}
      <div className="text-[11px] text-white/40 leading-relaxed line-clamp-2 mb-3">
        {prediction.description}
      </div>

      {/* Confidence bar */}
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(prediction.confidence * 100)}%` }}
          transition={{ delay: 0.3 + index * 0.07, duration: 0.6 }}
        />
      </div>
    </motion.button>
  );
});

// ─── Recovery Card ────────────────────────────────────────────────────────────

interface RecoveryCardProps {
  onCatchUp: () => void;
}

const RecoveryCard = React.memo(function RecoveryCard({ onCatchUp }: RecoveryCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onCatchUp}
      className="w-full p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] transition-colors text-left cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">☀️</span>
        <span className="text-sm font-bold text-amber-300">Catch up in one tap</span>
      </div>
      <p className="text-xs text-white/40 leading-relaxed">
        It looks like you haven't logged anything today yet. Tap here to start with quick water + focus to get back on track.
      </p>
    </motion.button>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

function AdaptiveConsoleInner() {
  const navigate = useNavigate();
  const { play } = useSoundFX();
  const { mutate: addWater } = useAddWater();

  const health = useTodayHealthData();
  const { readingStreak, codingStreak, focusStreak } = useAppStore();

  const now = new Date();
  const hour = now.getHours();

  // Build context
  const context: PredictionContext = useMemo(() => ({
    hour,
    dayOfWeek: now.getDay(),
    recentWaterMl: health.totalWaterMl ?? 0,
    recentFocusMin: 0, // focus minutes are tracked separately via focusSessions
    recentCalories: health.totalCalories ?? 0,
    hasLoggedSleep: !!health.sleepEntry,
    activeStreaks: {
      reading: readingStreak.currentStreak,
      coding: codingStreak.currentStreak,
      focus: focusStreak.currentStreak,
    },
  }), [
    hour,
    now.getDay(),
    health.totalWaterMl,
    health.totalCalories,
    health.sleepEntry,
    readingStreak.currentStreak,
    codingStreak.currentStreak,
    focusStreak.currentStreak,
  ]);

  const predictions = useMemo(() => generatePredictions(context), [context]);
  const greeting = useMemo(() => getContextGreeting(hour), [hour]);

  // Recovery detection: past 2pm and nothing logged
  const isRecoveryMode =
    hour >= 14 &&
    (health.totalWaterMl ?? 0) === 0 &&
    (health.totalCalories ?? 0) === 0 &&
    !health.sleepEntry;

  // ── Action handlers ──────────────────────────────────────────────────

  const executePrediction = useCallback(
    (p: PredictedAction) => {
      play('click');

      switch (p.action.type) {
        case 'water':
          addWater({
            amount: (p.action.payload.amount as number) ?? 250,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: todayString(),
          });
          play('success');
          toast.success(`Logged ${p.action.payload.amount ?? 250}ml Water! 💧`);
          break;

        case 'workout':
          toast.success('Navigate to Health to log your workout 💪');
          navigate('/health');
          break;

        case 'navigate':
          navigate((p.action.payload.path as string) ?? '/');
          break;

        default:
          toast.success(`${p.label} — action noted ⚡`);
          break;
      }
    },
    [addWater, navigate, play],
  );

  const handleCatchUp = useCallback(() => {
    play('click');
    // Quick-log 250ml water
    addWater({
      amount: 250,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: todayString(),
    });
    toast.success('Logged 250ml Water — now start a focus session! 💧🌲');
    navigate('/focus');
  }, [addWater, navigate, play]);

  // ── Render ───────────────────────────────────────────────────────────

  if (health.isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-5 border border-white/5 relative overflow-hidden"
    >
      {/* Decorative gradient shimmer */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="relative">
          <span className="text-lg">🧠</span>
          {/* Pulse ring */}
          <motion.div
            className="absolute -inset-1 rounded-full border border-violet-500/30"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          Mani AI
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-xs text-white/50 mb-5 pl-8">{greeting}</p>

      {/* Cards */}
      {isRecoveryMode ? (
        <RecoveryCard onCatchUp={handleCatchUp} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
          {predictions.map((p, i) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              index={i}
              onExecute={executePrediction}
            />
          ))}
        </div>
      )}

      {/* Powered-by tag */}
      <div className="flex items-center gap-1.5 mt-4 pl-1">
        <Zap size={10} className="text-violet-500/50" />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/15">
          Mani AI Prediction Engine v3
        </span>
      </div>
    </motion.div>
  );
}

const AdaptiveConsole = React.memo(AdaptiveConsoleInner);
export default AdaptiveConsole;
