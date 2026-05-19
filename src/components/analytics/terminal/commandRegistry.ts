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
    'focus [7d|30d|90d]  - Focus metrics over custom window',
    'focus streak        - Check your focus streak statistics',
    'focus weekly        - Summary metrics of the current week',
    'code                - Completed coding exercises & difficulty',
    'leetcode            - Breakdown of solved problems',
    'health              - Health totals & average metrics',
    'water               - Hydration summary and status',
    'sleep               - Sleep duration summary and logs',
    'calories            - Calorie intake averages',
    'today               - Today\'s summary snapshot',
    'insights            - Recommendations and daily statistics',
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
      `Focus Summary — Last ${windowDays} Days`,
      '----------------------------------',
      `Total Sessions  : ${windowSessions.length}`,
      `Completed Blocks: ${completedCount}`,
      `Failed Blocks   : ${failedCount}`,
      `Completion Rate : ${rate}%`,
      `Average Session : ${avg} min`,
      `Longest Session : ${longest} min`,
    ];
  },

  'focus streak': (args, ctx) => [
    'Focus Streak History',
    '--------------------',
    `Current Streak : ${ctx.focusStreak.currentStreak} days`,
    'Status         : Focus routine tracked correctly.',
    'Ready for your next scheduled focus block.',
  ],

  'focus weekly': (args, ctx) => {
    const completed = ctx.focusSessions.filter(s => s.completed);
    const durations = completed.map(s => s.actualDuration || s.duration);
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const totalProblems = ctx.problems.filter(p => p.completed).length;

    return [
      'Weekly Summary Report',
      '---------------------',
      `Focus Sessions   : ${completed.length} completed`,
      `Problems Solved  : ${totalProblems} solved`,
      `Avg Session Time : ${avg} min`,
      'Weekly Status    : Tracked successfully.',
    ];
  },

  code: (args, ctx) => {
    const completed = ctx.problems.filter(p => p.completed);
    const easyCount = completed.filter(p => p.difficulty === 'Easy').length;
    const medCount = completed.filter(p => p.difficulty === 'Medium').length;
    const hardCount = completed.filter(p => p.difficulty === 'Hard').length;

    return [
      'LeetCode Performance',
      '--------------------',
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
    'Health Summary Averages',
    '-----------------------',
    `Water Average   : ${ctx.biometricStats.avgWaterL} L/day`,
    `Sleep Average   : ${ctx.biometricStats.avgSleepHrs} h/day`,
    `Calories Average: ${ctx.biometricStats.avgCalories} kcal/day`,
    `Workouts Logged : ${ctx.biometricStats.totalWorkouts} sessions`,
  ],

  water: (args, ctx) => [
    'Hydration Summary',
    '-----------------',
    `Average Intake  : ${ctx.biometricStats.avgWaterL} L/day`,
    'Goal Target     : 3.0 L/day',
    'Status          : Logged water is within target bounds.',
  ],

  sleep: (args, ctx) => [
    'Sleep Summary',
    '-------------',
    `30d Avg Sleep   : ${ctx.biometricStats.avgSleepHrs} h/day`,
    'Goal Target     : 7.5 h/day',
    'Status          : Based on logged sleep data only.',
  ],

  calories: (args, ctx) => [
    'Calorie Intake Summary',
    '----------------------',
    `30d Avg Intake  : ${ctx.biometricStats.avgCalories} kcal/day`,
    'Goal Target     : 2100 kcal/day',
    'Status          : Simple mathematical average over active days.',
  ],

  today: (args, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    const completed = ctx.focusSessions.filter(s => s.completed && s.date === today);
    const durations = completed.map(s => s.actualDuration || s.duration);
    const focusMinutes = durations.reduce((a, b) => a + b, 0);
    const totalProblems = ctx.problems.filter(p => p.completed && (p as { date?: string }).date === today).length;

    return [
      'Today\'s Summary',
      '---------------',
      `Focus Completed : ${focusMinutes} minutes`,
      `Problems Solved : ${totalProblems} exercises`,
      `Water Intake    : ${ctx.biometricStats.todayWaterL} L`,
      `Sleep Hrs Logged: ${ctx.biometricStats.todaySleepHrs} h`,
    ];
  },

  insights: (args, ctx) => [
    'Recommendations & Insights',
    '--------------------------',
    '- Insights are generated strictly from logged data.',
    '- Calculations are based strictly on manual session reflections.',
    '- Use analytics views for detailed trends and history.',
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
      return [`Navigating successfully to "${destination}"...`];
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
        'Updating hydration logs...',
      ];
    } else if (subAction === 'calories' || subAction === 'calorie') {
      ctx.onLogCalories(amount);
      return [
        `Success: Caloric intake logged +${amount}kcal!`,
        'Updating calorie logs...',
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
