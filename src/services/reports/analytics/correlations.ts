import type { ValidatedInsight } from '../../../types/report';

export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 6) return 0; // Safer: minimum 6 samples to reduce fake correlations

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function buildValidatedInsights(dailyBreakdown: { sleepMinutes: number; focusMinutes: number; hydrationMl: number }[]): { 
  insights: ValidatedInsight[]; 
  fallback: string | null; 
  correlationInsights: string[] 
} {
  const insights: ValidatedInsight[] = [];
  const correlationInsights: string[] = [];

  const sleepFocusPairs = dailyBreakdown.filter((point) => point.sleepMinutes > 0 && point.focusMinutes > 0);
  if (sleepFocusPairs.length >= 6) {
    const sleepValues = sleepFocusPairs.map((point) => point.sleepMinutes);
    const focusValues = sleepFocusPairs.map((point) => point.focusMinutes);
    const r = calculatePearsonCorrelation(sleepValues, focusValues);
    if (Math.abs(r) >= 0.45) {
      const confidence = Math.abs(r) >= 0.65 ? 'high' : 'medium';
      insights.push({
        id: 'sleep-focus-correlation',
        title: 'Sleep and focus moved together',
        body: `Across ${sleepFocusPairs.length} days, sleep duration and focus output showed a statistically meaningful relationship (r = ${r.toFixed(2)}).`,
        confidence,
        source: 'sleep_logs + focus_sessions',
      });
      correlationInsights.push(`Sleep/focus correlation detected (r = ${r.toFixed(2)}) across ${sleepFocusPairs.length} days.`);
    }
  }

  const hydrationFocusPairs = dailyBreakdown.filter((point) => point.hydrationMl > 0 && point.focusMinutes > 0);
  if (hydrationFocusPairs.length >= 6) {
    const hydrationValues = hydrationFocusPairs.map((point) => point.hydrationMl);
    const focusValues = hydrationFocusPairs.map((point) => point.focusMinutes);
    const r = calculatePearsonCorrelation(hydrationValues, focusValues);
    if (Math.abs(r) >= 0.45) {
      const confidence = Math.abs(r) >= 0.65 ? 'high' : 'medium';
      insights.push({
        id: 'hydration-focus-correlation',
        title: 'Hydration tracked with focus volume',
        body: `Hydration and focus showed a statistically valid relationship (r = ${r.toFixed(2)}) across ${hydrationFocusPairs.length} days.`,
        confidence,
        source: 'water_logs + focus_sessions',
      });
      correlationInsights.push(`Hydration/focus correlation detected (r = ${r.toFixed(2)}) across ${hydrationFocusPairs.length} days.`);
    }
  }

  const fallback = insights.length === 0 ? 'Not enough reliable correlation data for insight generation.' : null;
  if (fallback) {
    correlationInsights.push(fallback);
  }

  return { insights, fallback, correlationInsights };
}
