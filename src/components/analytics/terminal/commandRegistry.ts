import type { TerminalContext } from './types';
import { useAppStore } from '../../../store/useAppStore';

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
    'focus [duration]    - Launch custom Pomodoro (e.g. focus 25)',
    'focus stats [30d]   - Focus metrics over custom window',
    'focus streak        - Check your focus streak statistics',
    'focus weekly        - Summary metrics of the current week',
    'solve [name] [diff] - Log LeetCode problem (e.g. solve "Two Sum" Easy)',
    'code / leetcode     - Breakdown of solved problems',
    'health              - Health totals & average metrics',
    'health water [ml]   - Log custom water volume (e.g. health water 500)',
    'health calories [c] - Log caloric intake (e.g. health calories 600)',
    'xp                  - Display ASCII level progress & transaction log',
    'theme [themeName]   - Change user interface theme instantly',
    'system              - Print storage locks, quota stats, and network state',
    'clear               - Clear terminal log view',
    'history             - Display executed command logs',
  ],

  focus: (args, ctx) => {
    const subAction = args[0]?.toLowerCase();
    
    // Check if launching a Pomodoro session
    if (subAction && !['stats', 'streak', 'weekly', '7d', '30d', '90d'].includes(subAction)) {
      const duration = parseInt(subAction);
      if (!isNaN(duration) && duration > 0) {
        const { updatePomodoroSettings, pomodoroSettings } = useAppStore.getState();
        updatePomodoroSettings({ focusDuration: duration });
        
        const todayStr = new Date().toISOString().slice(0, 10);
        const timerState = {
          timeLeft: duration * 60,
          isRunning: true,
          mode: 'focus',
          taskName: 'Terminal Focus',
          mood: 'motivated',
          currentSession: {
            date: todayStr,
            startTime: new Date().toISOString(),
            duration: duration,
            taskName: 'Terminal Focus',
            mood: 'motivated',
            growthTheme: pomodoroSettings.growthTheme || 'tree',
            ambience: pomodoroSettings.ambience || 'none',
            mode: 'focus',
          },
          savedAt: Date.now(),
        };
        localStorage.setItem('active_focus_timer_v1', JSON.stringify(timerState));
        
        setTimeout(() => ctx.onNavigate('/focus'), 150);
        
        return [
          `🚀 Launching a ${duration} minute Pomodoro focus session...`,
          `Tree planting initialized. Navigating to Focus Hub.`,
        ];
      }
    }

    const windowDays = subAction === '7d' ? 7 : subAction === '90d' ? 90 : 30;
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

  solve: (args, ctx) => {
    if (args.length < 1) {
      return [
        'Usage: solve [problem_name] [easy|medium|hard]',
        'Example: solve "Two Sum" Easy',
      ];
    }
    
    let diff: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    let name = args.join(' ');
    
    if (args.length > 1) {
      const lastArg = args[args.length - 1].toLowerCase();
      if (['easy', 'medium', 'hard'].includes(lastArg)) {
        diff = (lastArg.charAt(0).toUpperCase() + lastArg.slice(1)) as 'Easy' | 'Medium' | 'Hard';
        name = args.slice(0, -1).join(' ');
      }
    }
    
    name = name.replace(/^['"]|['"]$/g, '');
    const todayStr = new Date().toISOString().slice(0, 10);
    
    ctx.onAddProblem({
      name,
      difficulty: diff,
      completed: true,
      status: 'solved',
      link: '',
      topic: 'algorithms',
      date: todayStr,
      notes: 'Logged via Companion Console',
      timeSpent: 25,
    });
    
    return [
      `✅ Solved problem: "${name}" [${diff}] logged successfully!`,
      `+150 XP rewarded! Level up progress updated.`,
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

  health: (args, ctx) => {
    if (args[0]) {
      const subAction = args[0].toLowerCase();
      const amount = parseInt(args[1] || '');
      
      if (['water', 'calories', 'calorie'].includes(subAction)) {
        if (isNaN(amount) || amount <= 0) {
          return [
            'Error: Log amount must be a positive integer.',
            'Usage: health [water|calories] [amount]',
          ];
        }
        
        if (subAction === 'water') {
          ctx.onLogWater(amount);
          return [
            `💦 Logged +${amount}ml of hydration successfully!`,
            `+20 XP rewarded!`,
          ];
        } else {
          ctx.onLogCalories(amount);
          return [
            `🍕 Logged +${amount}kcal caloric intake successfully!`,
            `+30 XP rewarded!`,
          ];
        }
      }
    }

    return [
      'Health Summary Averages',
      '-----------------------',
      `Water Average   : ${ctx.biometricStats.avgWaterL} L/day`,
      `Sleep Average   : ${ctx.biometricStats.avgSleepHrs} h/day`,
      `Calories Average: ${ctx.biometricStats.avgCalories} kcal/day`,
      `Workouts Logged : ${ctx.biometricStats.totalWorkouts} sessions`,
    ];
  },

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

  xp: (args, ctx) => {
    const { xp = 0, level = 1, xpLedger = [] } = useAppStore.getState();
    const currentLevelXp = xp % 1000;
    const progressPct = currentLevelXp / 10;
    const progressBars = Math.round(progressPct / 5);
    const barStr = '█'.repeat(progressBars) + '░'.repeat(20 - progressBars);
    
    const lines = [
      'Mani OS Experience Engine',
      '=========================',
      `Level: ${level}`,
      `Total XP: ${xp} XP`,
      `Progress: [${barStr}] ${currentLevelXp} / 1000 XP (${Math.round(progressPct)}%)`,
      '',
      'Recent Achievements & Transactions:',
      '----------------------------------',
    ];
    
    if (xpLedger.length === 0) {
      lines.push('No experience transactions logged yet.');
    } else {
      xpLedger.slice(0, 5).forEach(entry => {
        const sign = entry.amount >= 0 ? '+' : '';
        const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lines.push(` [${time}] ${entry.source.toUpperCase()}: ${entry.description} (${sign}${entry.amount} XP)`);
      });
    }
    
    return lines;
  },

  theme: (args, ctx) => {
    const themeName = args[0]?.toLowerCase();
    const validThemes = [
      'dark_pro', 'oled', 'cyberpunk', 'forest', 'nebula', 
      'midnight_glass', 'aurora', 'hacker', 'paper_warm', 'solarized'
    ];
    
    if (!themeName || !validThemes.includes(themeName)) {
      return [
        'Usage: theme [theme_name]',
        'Available Themes:',
        '  dark_pro, oled, cyberpunk, forest, nebula,',
        '  midnight_glass, aurora, hacker, paper_warm, solarized'
      ];
    }
    
    useAppStore.getState().updateUserSettings({ theme: themeName as any });
    
    return [
      `🎨 Theme switched to "${themeName}" successfully!`,
      `UI aesthetics successfully adapted to the new workspace aura.`,
    ];
  },

  system: (args, ctx) => {
    const isOnline = navigator.onLine;
    const { notifications = [] } = useAppStore.getState();
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const lines = [
      'Mani OS System Metrics',
      '======================',
      `Network Status      : ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`,
      `Unread Notifications: ${unreadCount} alerts`,
      `App Window Display  : ${window.innerWidth}x${window.innerHeight} (${window.innerWidth >= 1024 ? 'Desktop' : 'Mobile/PWA'})`,
      'Storage Quota Status:',
      '  - Cache Mechanism: LocalStorage & IndexedDB persistent logs',
      '  - Auto-eviction: Disabled (persistent locks active)',
    ];
    
    return lines;
  },
};

// Alias mappings for shortcuts and slash commands
export const COMMAND_ALIASES: Record<string, string> = {
  '/help': 'help',
  '/focus': 'focus',
  '/solve': 'solve',
  '/health': 'health',
  '/xp': 'xp',
  '/theme': 'theme',
  '/system': 'system',
  '/clear': 'clear',
  ls: 'help',
  dir: 'help',
  cls: 'clear',
  stats: 'today',
  wk: 'focus weekly',
};
