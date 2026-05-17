import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { format, subDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  useAddWater,
  useAddMeal,
  useWater,
  useMeals,
  useWorkouts,
  useSleepEntries,
} from '../../hooks/useHealthQuery';

import type { FocusSession, Problem, BiometricStats, FocusStreak, TerminalMessage, TerminalContext } from './terminal/types';
import { COMMAND_REGISTRY, COMMAND_ALIASES } from './terminal/commandRegistry';
import TerminalInput from './terminal/TerminalInput';
import TerminalOutput from './terminal/TerminalOutput';

interface CompanionTerminalProps {
  itemAnim?: Variants;
  onClose?: () => void;
}

export default function CompanionTerminal({
  itemAnim = {},
  onClose,
}: CompanionTerminalProps) {
  const navigate = useNavigate();

  // ── Fetch dynamic store states internally ──
  const focusSessions = useAppStore(s => s.focusSessions) as FocusSession[];
  const problems      = useAppStore(s => s.problems) as Problem[];
  const focusStreak   = useAppStore(s => s.focusStreak) as FocusStreak;

  // ── Fetch biometrics internally ──
  const { data: waterLogs = [] }   = useWater();
  const { data: meals = [] }       = useMeals();
  const { data: workouts = [] }    = useWorkouts();
  const { data: sleepLogs = [] }   = useSleepEntries();

  const [history, setHistory] = useState<TerminalMessage[]>([
    {
      type: 'system',
      lines: [
        'Microsoft Windows [Version 10.0.22631]',
        '(c) Microsoft Corporation. All rights reserved.',
        '',
        'Companion Console v3.1.0. Global Overlay Active.',
        'Type "help" to view available productivity and control commands.',
      ],
    },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Health mutations
  const addWaterMut = useAddWater();
  const addMealMut  = useAddMeal();

  // Compute biometric statistics dynamically
  const biometricStats = useMemo<BiometricStats>(() => {
    const range = 30;
    const biometricData: Record<string, { water: number; calories: number; sleepMin: number }> = {};

    const ensure = (d: string) => {
      if (!biometricData[d]) biometricData[d] = { water: 0, calories: 0, sleepMin: 0 };
    };

    waterLogs.forEach(w => { ensure(w.date); biometricData[w.date].water += w.amount; });
    meals.forEach(m => { ensure(m.date); biometricData[m.date].calories += m.calories ?? 0; });
    sleepLogs.forEach(s => { ensure(s.date); biometricData[s.date].sleepMin += s.totalMinutes ?? 0; });

    let totalWater = 0, totalCalories = 0, totalSleepMin = 0;
    Array.from({ length: range }).forEach((_, i) => {
      const d = subDays(new Date(), (range - 1) - i);
      const key = format(d, 'yyyy-MM-dd');
      const day = biometricData[key] ?? { water: 0, calories: 0, sleepMin: 0 };
      totalWater += day.water;
      totalCalories += day.calories;
      totalSleepMin += day.sleepMin;
    });

    const div = Math.max(1, range);
    const inRangeWorkouts = workouts.filter(w => {
      try {
        const d = parseISO(w.date);
        return !isNaN(d.getTime()) && d >= subDays(new Date(), range);
      } catch {
        return false;
      }
    });

    return {
      avgWaterL: (totalWater / div / 1000).toFixed(2),
      avgSleepHrs: (totalSleepMin / div / 60).toFixed(1),
      avgCalories: Math.round(totalCalories / div),
      totalWorkouts: inRangeWorkouts.length,
    };
  }, [waterLogs, meals, workouts, sleepLogs]);

  // Auto-scroll logic
  useEffect(() => {
    if (containerRef.current) {
      const node = containerRef.current;
      requestAnimationFrame(() => {
        node.scrollTop = node.scrollHeight;
      });
    }
  }, [history]);

  const handleClear = useCallback(() => {
    setHistory([]);
  }, []);

  const handleExecuteCommand = useCallback((cmdRaw: string) => {
    const trimmed = cmdRaw.trim();
    if (!trimmed) return;

    const newMsg: TerminalMessage = {
      type: 'command',
      lines: [`> ${cmdRaw}`],
    };

    const [baseRaw, ...args] = trimmed.split(/\s+/);
    const base = baseRaw.toLowerCase();
    const resolvedCommand = COMMAND_ALIASES[base] || base;

    let responseLines: string[] = [];

    const ctx: TerminalContext = {
      focusSessions,
      problems,
      biometricStats,
      focusStreak,
      activityData: [],
      biometricActivityData: [],
      onNavigate: (path) => {
        // Trigger react-router-dom routing navigation
        navigate(path);
        if (onClose) {
          onClose(); // Automatically close overlay terminal on successful navigation
        }
      },
      onLogWater: (amount) => {
        addWaterMut.mutate({
          amount,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
        });
      },
      onLogCalories: (amount) => {
        addMealMut.mutate({
          name: 'Terminal Caloric Log',
          calories: amount,
          protein: Math.round(amount * 0.05), // Estimated 5% protein
          carbs: Math.round(amount * 0.12),
          fat: Math.round(amount * 0.04),
          mealType: 'snacks',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
        });
      },
    };

    const handler = COMMAND_REGISTRY[resolvedCommand];
    if (handler) {
      responseLines = handler(args, ctx);
    } else {
      responseLines = [
        `Unknown command: "${base}"`,
        'Type "help" to list valid control commands.',
      ];
    }

    const responseMsg: TerminalMessage = {
      type: 'response',
      lines: responseLines,
    };

    setHistory(prev => {
      const merged = [...prev, newMsg, responseMsg];
      return merged.slice(-60);
    });
    setCommandHistory(prev => [...prev, cmdRaw]);
  }, [focusSessions, problems, biometricStats, focusStreak, navigate, onClose, addWaterMut, addMealMut]);

  // Stable Callback Refs to completely isolate TerminalInput from parent re-renders
  const executeRef = useRef(handleExecuteCommand);
  executeRef.current = handleExecuteCommand;
  const stableExecute = useCallback((cmd: string) => {
    executeRef.current(cmd);
  }, []);

  const clearRef = useRef(handleClear);
  clearRef.current = handleClear;
  const stableClear = useCallback(() => {
    clearRef.current();
  }, []);

  return (
    <div
      className="glass-card p-6 border border-violet-500/20 relative overflow-hidden bg-black/75 backdrop-blur-md shadow-2xl rounded-2xl w-full transform-gpu"
      style={{ willChange: 'transform, filter' }}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-500/5 blur-[120px] pointer-events-none" />

      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] font-mono text-white/40 ml-2">OS Command Console</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE_SYNC
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/20 hover:text-white/60 text-xs font-mono transition-colors"
            >
              [ESC] CLOSE
            </button>
          )}
        </div>
      </div>

      {/* Output Console Log Area */}
      <TerminalOutput history={history} containerRef={containerRef} />

      {/* Dynamic Input Bar */}
      <TerminalInput
        commandHistory={commandHistory}
        onExecute={stableExecute}
        onClear={stableClear}
      />
    </div>
  );
}
