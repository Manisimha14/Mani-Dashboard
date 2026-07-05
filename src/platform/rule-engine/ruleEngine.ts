/**
 * Data-Driven Rule Engine for Policy Enforcement & Recommendations.
 */

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains';
  value: any;
}

export interface Rule {
  id: string;
  eventName: string;
  conditions: RuleCondition[];
  actionType: string;
  actionPayload: any;
}

class RuleEngineImpl {
  private rules: Rule[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Evaluates rules against context and registers actions.
   */
  public evaluate(eventName: string, context: Record<string, any>): Rule[] {
    const activeRules = this.rules.filter(r => r.eventName === eventName);
    const triggeredRules: Rule[] = [];

    for (const rule of activeRules) {
      let isMatch = true;
      for (const cond of rule.conditions) {
        const val = context[cond.field];
        if (!this.checkCondition(val, cond.operator, cond.value)) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules;
  }

  /**
   * Registers a new rule dynamically.
   */
  public registerRule(rule: Rule): void {
    this.rules.push(rule);
  }

  private checkCondition(val: any, op: string, targetVal: any): boolean {
    if (val === undefined || val === null) return false;
    switch (op) {
      case 'equals': return val === targetVal;
      case 'greaterThan': return val > targetVal;
      case 'lessThan': return val < targetVal;
      case 'contains': return Array.isArray(val) && val.includes(targetVal);
      case 'notContains': return Array.isArray(val) && !val.includes(targetVal);
      default: return false;
    }
  }

  private loadDefaultRules(): void {
    // Recommendation rule: completed workout triggers protein recommendation
    this.registerRule({
      id: 'rule-workout-protein',
      eventName: 'workout.completed',
      conditions: [
        { field: 'proteinLoggedToday', operator: 'equals', value: 0 }
      ],
      actionType: 'RECOMMEND_PROTEIN',
      actionPayload: { message: 'Workout completed! Add some protein in the next 15 minutes.' }
    });

    // Alert fatigue rule: focus completed triggers hydration alert
    this.registerRule({
      id: 'rule-focus-hydration',
      eventName: 'focus.completed',
      conditions: [
        { field: 'waterLoggedToday', operator: 'lessThan', value: 1000 }
      ],
      actionType: 'RECOMMEND_WATER',
      actionPayload: { message: 'Great job focusing! Stay hydrated — log 250ml water now.' }
    });
  }
}

export const ruleEngine = new RuleEngineImpl();
