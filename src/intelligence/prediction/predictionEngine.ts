import type { PredictionContext } from '../../services/ail/prediction.service';

export interface PredictionResult {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: {
    type: 'water' | 'sleep' | 'focus' | 'workout' | 'navigate';
    payload: any;
  };
  confidence: number;
  providerId: string;
}

export interface PredictionProvider {
  id: string;
  predict(context: PredictionContext): Promise<PredictionResult[]>;
}

// ─── Rule-Based Predictor ──────────────────────────────────────────────────
export class RuleBasedPredictor implements PredictionProvider {
  public id = 'rule-based-predictor';

  public async predict(context: PredictionContext): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    const { hour } = context;

    // Morning routine (5 AM - 11 AM)
    if (hour >= 5 && hour < 11) {
      if (!context.hasLoggedSleep) {
        predictions.push({
          id: 'pred-sleep',
          label: 'Log Sleep',
          description: 'Log your sleep to check your cognitive recovery metrics.',
          icon: '🌙',
          action: { type: 'navigate', payload: { path: '/health' } },
          confidence: 0.95,
          providerId: this.id
        });
      }
      if (context.recentWaterMl < 500) {
        predictions.push({
          id: 'pred-water-morning',
          label: 'Morning Hydration',
          description: 'Log 250ml water to start your cognitive operations.',
          icon: '💧',
          action: { type: 'water', payload: { amount: 250 } },
          confidence: 0.85,
          providerId: this.id
        });
      }
    }

    // Afternoon deep work (11 AM - 5 PM)
    if (hour >= 11 && hour < 17) {
      predictions.push({
        id: 'pred-focus-session',
        label: 'Start Focus Mode',
        description: 'Time to log some deep work. Plant your next tree.',
        icon: '🌲',
        action: { type: 'navigate', payload: { path: '/focus' } },
        confidence: 0.90,
        providerId: this.id
      });
    }

    return predictions;
  }
}

// ─── Statistical Markov Chain Predictor ─────────────────────────────────────
export class StatisticalPredictor implements PredictionProvider {
  public id = 'statistical-predictor';

  public async predict(context: PredictionContext): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    
    // Suggest water if water is lower than goal thresholds
    if (context.recentWaterMl < 1500) {
      predictions.push({
        id: 'pred-water-stat',
        label: 'Hydrate Now',
        description: 'You hydated less than your average statistical pattern today.',
        icon: '💧',
        action: { type: 'water', payload: { amount: 500 } },
        confidence: 0.75,
        providerId: this.id
      });
    }

    return predictions;
  }
}

// ─── Main Aggregated Prediction Engine ──────────────────────────────────────
class PredictionEngineImpl {
  private providers: PredictionProvider[] = [];

  constructor() {
    this.registerProvider(new RuleBasedPredictor());
    this.registerProvider(new StatisticalPredictor());
  }

  public registerProvider(provider: PredictionProvider): void {
    this.providers.push(provider);
  }

  /**
   * Aggregates predictions across all registered providers.
   */
  public async getPredictions(context: PredictionContext): Promise<PredictionResult[]> {
    const allResults: PredictionResult[] = [];
    for (const provider of this.providers) {
      try {
        const results = await provider.predict(context);
        allResults.push(...results);
      } catch (e) {
        console.error(`[PredictionEngine] Provider ${provider.id} failed:`, e);
      }
    }

    // Deduplicate and sort by confidence descending
    const uniqueMap = new Map<string, PredictionResult>();
    allResults.forEach(res => {
      const existing = uniqueMap.get(res.id);
      if (!existing || existing.confidence < res.confidence) {
        uniqueMap.set(res.id, res);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => b.confidence - a.confidence);
  }
}

export const predictionEngine = new PredictionEngineImpl();
