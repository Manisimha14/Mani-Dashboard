import type { PredictionResult } from '../prediction/predictionEngine';

export interface RecommendationResult extends PredictionResult {
  reason: string;
}

export class RecommendationEngine {
  /**
   * Translates raw predictions into recommendations by applying goals and filtering alert fatigue.
   */
  public static filterAndRank(
    predictions: PredictionResult[],
    context: {
      waterLoggedToday: number;
      focusSessionsToday: number;
      hasLoggedSleep: boolean;
    }
  ): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];

    for (const pred of predictions) {
      let shouldRecommend = true;
      let reason = 'Suggested by historical pattern algorithms.';

      // Rule 1: Exclude already completed tasks to prevent noise
      if (pred.action.type === 'water' && context.waterLoggedToday >= 2000) {
        shouldRecommend = false;
      }
      if (pred.id === 'pred-sleep' && context.hasLoggedSleep) {
        shouldRecommend = false;
      }

      // Rule 2: Prioritize hydration warnings
      if (pred.action.type === 'water' && context.waterLoggedToday === 0) {
        reason = 'Boosted priority because you have not hydrated today.';
      }

      if (shouldRecommend) {
        recommendations.push({
          ...pred,
          reason,
        });
      }
    }

    return recommendations.slice(0, 4); // return top 4 recommendations
  }
}
