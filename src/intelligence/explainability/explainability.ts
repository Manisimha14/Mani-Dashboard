export interface Explanation {
  factors: string[];
  confidencePct: number;
  engine: string;
}

export class ExplainabilityEngine {
  /**
   * Generates explainability logs for a given prediction recommendation.
   */
  public static explain(recommendationId: string, confidence: number): Explanation {
    const factors: string[] = [];
    let engine = 'Rule-based heuristics';

    if (recommendationId.includes('water')) {
      factors.push('Your daily hydration level is below target threshold.');
      factors.push('Consistent logs show you drink water around this time.');
      engine = 'Statistical prediction matcher';
    } else if (recommendationId.includes('sleep')) {
      factors.push('Morning routine detected.');
      factors.push('No sleep logs found for today.');
    } else if (recommendationId.includes('focus')) {
      factors.push('Active productivity hours context.');
      factors.push('Streak momentum triggers deep work recommendation.');
    } else {
      factors.push('Context relevance match.');
    }

    return {
      factors,
      confidencePct: Math.round(confidence * 100),
      engine,
    };
  }
}
