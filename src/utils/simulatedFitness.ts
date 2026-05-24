/**
 * Deterministic daily fitness simulation utility.
 *
 * Produces consistent, realistic activity values for a given date using
 * a seeded pseudo-random number generator (LCG). Calling this multiple
 * times on the same day always returns identical values, so the simulated
 * sync is stable across button presses.
 *
 * Ranges are calibrated to plausible adult activity levels:
 *   Steps:          5,000 – 11,000 / day
 *   Calories:       180   – 380    kcal active burn
 *   Active minutes: 25    – 55     min
 */

/** LCG seeded PRNG — deterministic, fast, good enough for simulation */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296; // normalize to [0, 1)
  };
}

/** Seed from date string 'YYYY-MM-DD' */
function dateSeed(dateStr: string): number {
  return dateStr
    .replace(/-/g, '')
    .split('')
    .reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
}

export interface SimulatedFitnessData {
  steps: number;
  calories: number;
  activeMinutes: number;
}

/**
 * Returns consistent, realistic fitness values for the given date.
 * Values change day-to-day but stay stable when called multiple times
 * on the same date.
 */
export function getSimulatedFitnessData(dateStr: string): SimulatedFitnessData {
  const rand = seededRandom(dateSeed(dateStr));

  // Steps: 5,000 – 11,000 (most people hit 6k–9k on an average day)
  const steps = Math.round((rand() * 6000 + 5000) / 100) * 100;

  // Active calories: proportional to steps, ±15% noise
  const baseCalories = Math.round(steps * 0.035);
  const calNoise = Math.round((rand() - 0.5) * baseCalories * 0.3);
  const calories = Math.max(150, Math.min(400, baseCalories + calNoise));

  // Active minutes: 25 – 55 min, loosely correlated with steps
  const baseMins = Math.round(steps / 200);
  const minsNoise = Math.round((rand() - 0.5) * 10);
  const activeMinutes = Math.max(25, Math.min(55, baseMins + minsNoise));

  return { steps, calories, activeMinutes };
}
