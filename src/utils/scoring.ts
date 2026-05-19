import type { LeetCodeProblem } from '../types';

/**
 * Calculates a balanced Focus & Energy Quality Score (0-100 index).
 * 
 * Cheat-Proof Mechanics:
 * - Coding: Evaluated by difficulty weight (Easy = 1, Medium = 2, Hard = 4) instead of absolute counts.
 * - Focus: Focus duration scores are scaled by completion rate, penalizing users who start many sessions but abandon them early.
 */
export const calculateFocusQualityScore = (params: {
  completedSessionsCount: number;
  totalSessionsCount: number;
  focusMinutes: number;
  problemsSolvedList: LeetCodeProblem[];
  consistencyDays: number;
  averageSleepMinutes: number;
  sleepGoalMinutes: number;
  focusGoalMinutes: number;
  codingGoalPoints: number;
}): number => {
  const {
    completedSessionsCount,
    totalSessionsCount,
    focusMinutes,
    problemsSolvedList,
    consistencyDays,
    averageSleepMinutes,
    sleepGoalMinutes,
    focusGoalMinutes,
    codingGoalPoints
  } = params;

  // 1. Completion Rate (30% Weight)
  const completionRate = totalSessionsCount > 0
    ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
    : 100;

  // 2. Focus Consistency (25% Weight)
  const consistencyScore = (consistencyDays / 7) * 100;

  // 3. Cheat-Proof Output Quality (25% Weight)
  // Difficulty weighting: Easy = 1, Medium = 2, Hard = 4
  const weightedCodingPoints = problemsSolvedList.reduce((acc, p) => {
    if (!p.completed) return acc;
    if (p.difficulty === 'Medium') return acc + 2;
    if (p.difficulty === 'Hard') return acc + 4;
    return acc + 1; // Easy
  }, 0);

  const codingTargetScore = Math.min((weightedCodingPoints / codingGoalPoints) * 100, 100);

  // Focus duration score scaled by completion rate percentage (preventing endless idle starts)
  const baseDurationScore = Math.min((focusMinutes / focusGoalMinutes) * 100, 120); // capped at 120%
  const focusTargetScore = baseDurationScore * (completionRate / 100);

  const combinedOutputScore = Math.min((focusTargetScore * 0.6) + (codingTargetScore * 0.4), 100);

  // 4. Sleep Recovery (20% Weight)
  const sleepAvgScore = Math.min((averageSleepMinutes / sleepGoalMinutes) * 100, 100);

  // Final Composite Score
  const compositeScore = Math.round(
    (completionRate * 0.3) +
    (consistencyScore * 0.25) +
    (combinedOutputScore * 0.25) +
    (sleepAvgScore * 0.2)
  );

  return Math.max(0, Math.min(compositeScore, 100));
};
