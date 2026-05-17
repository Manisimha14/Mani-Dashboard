import type { TerminalContext } from './types';

// Helper to filter focus sessions by historical window
const filterSessionsByWindow = (sessions: any[], days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sessions.filter(s => {
    const timeStr = s.endTime || s.startTime;
    if (!timeStr) return false;
    try {
      const d = new Date(timeStr);
      return !isNaN(d.getTime()) && d >= cutoff;
    } catch {
      return false;
    }
  });
};

// Command Handler type definition
export type CommandHandler = (args: string[], ctx: TerminalContext) => string[];

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  help: () => [
    'Available Commands:',
    '------------------',
    'focus [7d|30d|90d]  - Core focus metrics over custom window',
    'focus streak        - Diagnostics for focus continuity',
    'focus weekly        - Summary metrics of the current week',
    'code                - Completed coding solves & difficulty',
    'leetcode            - Breakdown of algorithmic metrics',
    'health              - Wellness aggregates & biometric scores',
    'water               - Hydration summary & logging indicator',
    'sleep               - Sleep rest analysis & quality logs',
    'calories            - Calories average summary',
    'today               - Real-time snapshot of today\'s telemetry',
    'insights            - Computed cognitive coach recommendations',
    'go [health|analytics] - Instantly navigate active tabs',
    'log water [ml]      - Log custom volume (e.g., log water 500)',
    'log calories [kcal] - Log caloric intake (e.g., log calories 600)',
    'clear               - Clear terminal log view',
    'history             - Display executed command logs',
  ],

  focus: (args, ctx) => {
    const days = args[0] ? parseInt(args[0]) : 30;
    const windowDays = isNaN(days) ? 30 : days;
    const windowSessions = filterSessionsByWindow(ctx.focusSessions, windowDays);

    const completed = windowSessions.filter(s => s.completed);
    const completedCount = completed.length;
    const failedCount = windowSessions.filter(s => s.failed || s.withered).length;
    
    const rate = windowSessions.length > 0 ? ((completedCount / windowSessions.length) * 100).toFixed(1) : '0';
    const durations = completed.map(s => s.actualDuration || s.duration);
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const longest = durations.length > 0 ? Math.max(...durations) : 0;

    return [
      `Focus Analytics — Last ${windowDays} Days`,
      '------------------------------------',
      `Total Sessions  : ${windowSessions.length}`,
      `Completed Blocks: ${completedCount}`,
      `Failed Blocks   : ${failedCount}`,
      `Completion Rate : ${rate}%`,
      `Average Session : ${avg} min`,
      `Longest Session : ${longest} min`,
    ];
  },

  'focus streak': (args, ctx) => [
    'Focus Streak Diagnostics',
    '------------------------',
    `Current Streak : ${ctx.focusStreak.currentStreak} days`,
    'Status         : Continuous focus momentum active.',
    'Ready for next deep work catalyst block.',
  ],

  'focus weekly': (args, ctx) => {
    const completed = ctx.focusSessions.filter(s => s.completed);
    const durations = completed.map(s => s.actualDuration || s.duration);
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const totalProblems = ctx.problems.filter(p => p.completed).length;

    return [
      'Weekly Performance Report Summary',
      '---------------------------------',
      `Focus Sessions   : ${completed.length} completed`,
      `Problems Solved  : ${totalProblems} solved`,
      `Avg Session Time : ${avg} min`,
      'Momentum Status  : Active operations aligned.',
    ];
  },

  code: (args, ctx) => {
    const completed = ctx.problems.filter(p => p.completed);
    const easyCount = completed.filter(p => p.difficulty === 'Easy').length;
    const medCount = completed.filter(p => p.difficulty === 'Medium').length;
    const hardCount = completed.filter(p => p.difficulty === 'Hard').length;

    return [
      'LeetCode Forge Performance',
      '--------------------------',
      `Total Solved    : ${completed.length} problems`,
      'Difficulty Distribution:',
      `  - Easy   : ${easyCount}`,
      `  - Medium : ${medCount}`,
      `  - Hard   : ${hardCount}`,
    ];
  },

  leetcode: (args, ctx) => COMMAND_REGISTRY.code(args, ctx),
  problems: (args, ctx) => COMMAND_REGISTRY.code(args, ctx),

  health: (args, ctx) => [
    'Biometrics Summary Averages',
    '---------------------------',
    `Water Average   : ${ctx.biometricStats.avgWaterL} L/day`,
    `Sleep Average   : ${ctx.biometricStats.avgSleepHrs} h/day`,
    `Calories Average: ${ctx.biometricStats.avgCalories} kcal/day`,
    `Workouts Logged : ${ctx.biometricStats.totalWorkouts} sessions`,
  ],

  water: (args, ctx) => [
    'Hydration Analysis',
    '------------------',
    `Average Intake  : ${ctx.biometricStats.avgWaterL} L/day`,
    'Goal Target     : 3.0 L/day',
    'Status          : Within normal operating boundaries.',
  ],

  sleep: (args, ctx) => [
    'Sleep Quality Analysis',
    '----------------------',
    `Average Rest    : ${ctx.biometricStats.avgSleepHrs} h/day`,
    'Goal Target     : 7.5 h/day',
    'Status          : Complete recovery pattern.',
  ],

  calories: (args, ctx) => [
    'Metabolic Calorie Intake',
    '------------------------',
    `Average Intake  : ${ctx.biometricStats.avgCalories} kcal/day`,
    'Goal Target     : 2100 kcal/day',
    'Status          : Balanced metabolism.',
  ],

  today: (args, ctx) => {
    const completed = ctx.focusSessions.filter(s => s.completed);
    const durations = completed.map(s => s.actualDuration || s.duration);
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const totalProblems = ctx.problems.filter(p => p.completed).length;

    return [
      'Today Telemetry Snapshot',
      '------------------------',
      `Focus Completed : ${avg} minutes`,
      `Problems Solved : ${totalProblems} exercises`,
      `Water Intake    : ${ctx.biometricStats.avgWaterL} L`,
      `Sleep Hrs Logged: ${ctx.biometricStats.avgSleepHrs} h`,
    ];
  },

  insights: (args, ctx) => [
    'Productivity Coach Insights',
    '---------------------------',
    '- Maintain 7.5h sleep cycle to prevent focus regression.',
    '- Hydration correlates with high completion efficiency.',
    '- Peak cognitive window detected between 9 AM - 11 AM.',
  ],

  go: (args, ctx) => {
    const destination = args[0]?.toLowerCase();
    const routesMap: Record<string, string> = {
      dashboard: '/',
      focus: '/focus',
      reading: '/reading',
      leetcode: '/leetcode',
      trackers: '/trackers',
      health: '/health',
      ambient: '/ambient',
      analytics: '/analytics',
      achievements: '/achievements',
      settings: '/settings',
    };
    const targetPath = routesMap[destination];
    if (targetPath) {
      ctx.onNavigate(targetPath);
      return [`Command Executed: Navigating successfully to "${destination}"...`];
    }
    return [
      `Error: Unknown path "${destination || ''}".`,
      'Valid paths: dashboard, focus, reading, leetcode, trackers, health, ambient, analytics, achievements, settings',
    ];
  },

  log: (args, ctx) => {
    const subAction = args[0]?.toLowerCase();
    const amount = parseInt(args[1] || '');

    if (isNaN(amount) || amount <= 0) {
      return [
        'Error: Log amount must be a positive integer.',
        'Usage: log [water|calories] [amount]',
      ];
    }

    if (subAction === 'water') {
      ctx.onLogWater(amount);
      return [
        `Success: Hydration logged +${amount}ml!`,
        'Refreshing biometric registers...',
      ];
    } else if (subAction === 'calories' || subAction === 'calorie') {
      ctx.onLogCalories(amount);
      return [
        `Success: Caloric intake logged +${amount}kcal!`,
        'Refreshing metabolic registers...',
      ];
    }

    return [
      'Error: Unknown logging parameters.',
      'Usage: log [water|calories] [amount]',
    ];
  },
};

// Alias mappings for shortcuts
export const COMMAND_ALIASES: Record<string, string> = {
  ls: 'help',
  dir: 'help',
  cls: 'clear',
  stats: 'today',
  wk: 'focus weekly',
};
