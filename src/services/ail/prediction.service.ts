/**
 * AIL — Context-Aware Prediction Engine
 *
 * Generates ranked, suggested quick actions based on:
 *  • Current time of day (morning / afternoon / evening / night)
 *  • Day of week (weekday vs weekend bias)
 *  • What has already been logged today (gap detection)
 *  • Active streaks (preserving momentum)
 *
 * All logic is fully client-side — no network calls.
 */

import { generateId } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single suggested action surfaced by the prediction engine. */
export interface PredictedAction {
  id: string;
  label: string;
  description: string;
  /** Emoji string used as the icon. */
  icon: string;
  action: {
    type: 'water' | 'sleep' | 'focus' | 'workout' | 'navigate';
    payload: Record<string, unknown>;
  };
  /** Confidence score between 0 and 1, used for sorting and opacity. */
  confidence: number;
}

/** Snapshot of the user's current context required to generate predictions. */
export interface PredictionContext {
  /** Current hour (0-23). */
  hour: number;
  /** Day of week (0 = Sunday … 6 = Saturday). */
  dayOfWeek: number;
  /** Total water logged today in ml. */
  recentWaterMl: number;
  /** Total focus minutes logged today. */
  recentFocusMin: number;
  /** Total calories logged today. */
  recentCalories: number;
  /** Whether the user has logged sleep for today. */
  hasLoggedSleep: boolean;
  /** Current active streak lengths. */
  activeStreaks: {
    reading: number;
    coding: number;
    focus: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getGreeting(slot: TimeSlot): string {
  switch (slot) {
    case 'morning':   return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening':   return 'Good evening';
    case 'night':     return 'Winding down';
  }
}

/** Clamp a confidence value into [0, 1]. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── Candidate builders ──────────────────────────────────────────────────────

function buildCandidates(ctx: PredictionContext): PredictedAction[] {
  const slot = getTimeSlot(ctx.hour);
  const candidates: PredictedAction[] = [];
  const isWeekend = ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6;

  // ── Water ──────────────────────────────────────────────────────────────
  // Universal — always relevant, boosted when under-hydrated.
  const waterTarget = 2500; // ml
  const waterRatio = ctx.recentWaterMl / waterTarget;
  let waterConf = 0.5;
  if (waterRatio < 0.3) waterConf = 0.92;
  else if (waterRatio < 0.6) waterConf = 0.75;
  else if (waterRatio < 1) waterConf = 0.55;
  else waterConf = 0.2; // already met target
  // Morning bump
  if (slot === 'morning') waterConf = clamp01(waterConf + 0.08);

  candidates.push({
    id: generateId(),
    label: 'Log Water',
    description: ctx.recentWaterMl === 0
      ? "You haven't hydrated today — start now"
      : `${ctx.recentWaterMl}ml so far — keep it going`,
    icon: '💧',
    action: { type: 'water', payload: { amount: 250 } },
    confidence: clamp01(waterConf),
  });

  // ── Sleep ──────────────────────────────────────────────────────────────
  if (!ctx.hasLoggedSleep) {
    let sleepConf = 0.3;
    if (slot === 'morning') sleepConf = 0.9;
    if (slot === 'night') sleepConf = 0.8;
    if (slot === 'afternoon') sleepConf = 0.4;

    candidates.push({
      id: generateId(),
      label: 'Log Sleep',
      description: slot === 'morning'
        ? 'Record last night before you forget'
        : 'Track your rest to spot patterns',
      icon: '🌙',
      action: { type: 'navigate', payload: { path: '/health' } },
      confidence: clamp01(sleepConf),
    });
  }

  // ── Focus ──────────────────────────────────────────────────────────────
  if (slot !== 'night') {
    let focusConf = 0.5;
    if (slot === 'morning') focusConf = 0.7;
    if (slot === 'afternoon') focusConf = 0.85;
    if (ctx.recentFocusMin === 0) focusConf = clamp01(focusConf + 0.15);
    if (ctx.activeStreaks.focus > 3) focusConf = clamp01(focusConf + 0.1);
    if (isWeekend) focusConf = clamp01(focusConf - 0.1);

    candidates.push({
      id: generateId(),
      label: 'Start Focus',
      description: ctx.recentFocusMin === 0
        ? 'No focus logged yet — begin a 25-min sprint'
        : `${ctx.recentFocusMin}min focused — keep the momentum`,
      icon: '🌲',
      action: { type: 'navigate', payload: { path: '/focus' } },
      confidence: clamp01(focusConf),
    });
  }

  // ── Workout ────────────────────────────────────────────────────────────
  if (slot === 'evening' || slot === 'afternoon') {
    let workoutConf = slot === 'evening' ? 0.78 : 0.55;
    if (isWeekend) workoutConf = clamp01(workoutConf + 0.1);

    candidates.push({
      id: generateId(),
      label: 'Log Workout',
      description: slot === 'evening'
        ? 'Evening is prime workout time'
        : 'A midday workout boosts focus',
      icon: '💪',
      action: { type: 'workout', payload: { durationMinutes: 30 } },
      confidence: clamp01(workoutConf),
    });
  }

  // ── Calories / Meals ───────────────────────────────────────────────────
  const mealLabel = slot === 'morning' ? 'Log Breakfast'
    : slot === 'afternoon' ? 'Log Lunch'
    : slot === 'evening' ? 'Log Dinner'
    : 'Log Snack';

  let mealConf = 0.5;
  if (ctx.recentCalories === 0) mealConf = 0.8;
  else if (ctx.recentCalories < 1200) mealConf = 0.65;
  else mealConf = 0.3;

  candidates.push({
    id: generateId(),
    label: mealLabel,
    description: ctx.recentCalories === 0
      ? "No meals logged yet — don't forget"
      : `${ctx.recentCalories} kcal tracked so far`,
    icon: '🍽️',
    action: { type: 'navigate', payload: { path: '/health' } },
    confidence: clamp01(mealConf),
  });

  // ── Reading ────────────────────────────────────────────────────────────
  if (slot === 'evening' || slot === 'night') {
    let readConf = slot === 'evening' ? 0.65 : 0.75;
    if (ctx.activeStreaks.reading > 3) readConf = clamp01(readConf + 0.1);

    candidates.push({
      id: generateId(),
      label: 'Continue Reading',
      description: ctx.activeStreaks.reading > 0
        ? `${ctx.activeStreaks.reading}-day streak — don't break it`
        : 'Wind down with a chapter tonight',
      icon: '📖',
      action: { type: 'navigate', payload: { path: '/reading' } },
      confidence: clamp01(readConf),
    });
  }

  // ── Coding / LeetCode ─────────────────────────────────────────────────
  if (slot === 'morning' || slot === 'afternoon') {
    let codeConf = 0.55;
    if (ctx.activeStreaks.coding > 3) codeConf = clamp01(codeConf + 0.15);
    if (slot === 'afternoon') codeConf = clamp01(codeConf + 0.1);

    candidates.push({
      id: generateId(),
      label: 'Solve a Problem',
      description: ctx.activeStreaks.coding > 0
        ? `${ctx.activeStreaks.coding}-day streak — keep grinding`
        : 'Sharpen your skills with a LeetCode problem',
      icon: '🧩',
      action: { type: 'navigate', payload: { path: '/leetcode' } },
      confidence: clamp01(codeConf),
    });
  }

  return candidates;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate 3-5 predicted quick actions based on the user's current context.
 *
 * @param context — snapshot of hour, logged data, and streaks.
 * @returns Sorted (highest confidence first) list of predicted actions.
 */
export function generatePredictions(context: PredictionContext): PredictedAction[] {
  const candidates = buildCandidates(context);

  // Sort by confidence descending, return top 5
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

/**
 * Get a context-aware greeting string for the Adaptive Console header.
 */
export function getContextGreeting(hour: number): string {
  const slot = getTimeSlot(hour);
  return `${getGreeting(slot)} — here's what your patterns suggest`;
}
