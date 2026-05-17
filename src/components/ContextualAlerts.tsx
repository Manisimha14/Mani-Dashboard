import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { getContextualNotifications } from '../lib/notifications';
import { useWeather } from '../hooks/useWeather';
import { getProductivityScore } from '../lib/utils';
import { useTodayHealthData, useHealthGoals } from '../hooks/useHealthQuery';
import { useProfile } from '../hooks/useProfileQuery';
import { Sparkles, Sun, CloudRain, Moon, Zap, Flame, Clock, Heart, Droplets, Dumbbell } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  sun: Sun,
  'cloud-rain': CloudRain,
  moon: Moon,
  zap: Zap,
  flame: Flame,
  clock: Clock,
  heart: Heart,
  droplets: Droplets,
  dumbbell: Dumbbell
};

export default function ContextualAlerts() {
  const dailyActivity = useAppStore(s => s.dailyActivity);
  const readingStreak = useAppStore(s => s.readingStreak);
  const codingStreak = useAppStore(s => s.codingStreak);
  const focusStreak = useAppStore(s => s.focusStreak);
  const localSettings = useAppStore(s => s.userSettings);
  const focusSessions = useAppStore(s => s.focusSessions);
  const problems = useAppStore(s => s.problems);
  const { type: weatherType } = useWeather();
  
  const todayHealth = useTodayHealthData();
  const { data: healthGoals = [] } = useHealthGoals();
  const { data: profile } = useProfile();
  
  const settings = profile?.settings || localSettings;
  
  const notifications = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = dailyActivity.find(a => a.date === today);
    const prodScore = getProductivityScore(
      todayActivity?.chaptersRead || 0,
      todayActivity?.problemsSolved || 0,
      todayActivity?.focusMinutes || 0
    );

    const baseNotifications = getContextualNotifications({
      weatherType: weatherType,
      prodScore,
      readingStreak: readingStreak.currentStreak,
      codingStreak: codingStreak.currentStreak,
      focusStreak: focusStreak.currentStreak,
      hour: new Date().getHours(),
      humorLevel: 'balanced'
    });

    const list = [...baseNotifications];

    // ─── RESTRICTIONS ENGINE LIVE WARNINGS ───
    if (settings.calorieCapEnabled !== false) {
      const limit = settings.calorieCap ?? 2100;
      if (todayHealth.totalCalories > limit) {
        list.unshift({
          id: 'restriction-calorie-cap',
          title: '🔴 Calorie Cap Exceeded',
          message: `Current intake is ${todayHealth.totalCalories} kcal, exceeding your strict cap of ${limit} kcal. Enforcing discipline.`,
          tone: 'warning',
          category: 'system',
          icon: 'heart'
        });
      }
    }

    if (settings.sugarCapEnabled !== false) {
      const limit = settings.sugarCap ?? 25;
      const estimatedSugar = todayHealth.meals.reduce((acc, m) => {
        if (/sweet|sugar|candy|cookie|cake|donut|soda|juice|coke|dessert|chocolate/i.test(m.name)) {
          return acc + (m.carbs * 0.8);
        }
        return acc + (m.carbs * 0.15);
      }, 0);
      
      if (estimatedSugar > limit) {
        list.unshift({
          id: 'restriction-sugar-exceeded',
          title: '🔴 Sugar Cap Exceeded',
          message: `Estimated sugar consumption is ${estimatedSugar.toFixed(0)}g, breaching your daily cap limit of ${limit}g.`,
          tone: 'warning',
          category: 'system',
          icon: 'heart'
        });
      } else if (estimatedSugar > limit * 0.8) {
        list.unshift({
          id: 'restriction-sugar-near',
          title: '⚠️ Sugar Cap Nearing',
          message: `Estimated sugar intake (${estimatedSugar.toFixed(0)}g) is nearing your strict cap of ${limit}g.`,
          tone: 'motivation',
          category: 'system',
          icon: 'heart'
        });
      }
    }

    if (settings.caffeineCapEnabled !== false) {
      const limit = settings.caffeineCap ?? 2;
      const caffeineCount = todayHealth.meals.filter(m => 
        /coffee|espresso|caffeine|tea|latte|cappuccino|energy drink|monster|red bull/i.test(m.name)
      ).length;
      
      if (caffeineCount > limit) {
        list.unshift({
          id: 'restriction-caffeine-cap',
          title: '⚠️ Caffeine Cap Exceeded',
          message: `You've logged ${caffeineCount} cups of caffeine today, exceeding your set cap of ${limit}/day.`,
          tone: 'warning',
          category: 'system',
          icon: 'zap'
        });
      }
    }

    if (settings.junkCapEnabled !== false) {
      const todayDay = new Date().getDay();
      const isWeekday = todayDay >= 1 && todayDay <= 5;
      const junkMeals = todayHealth.meals.filter(m => 
        /burger|pizza|fries|chips|hotdog|fried chicken|kfc|mcdonald|burger king|taco/i.test(m.name)
      );
      
      if (isWeekday && junkMeals.length > 0) {
        list.unshift({
          id: 'restriction-junk-food',
          title: '🚫 Weekday Junk Restrict',
          message: `You logged weekday fast food (${junkMeals[0].name}), violating your strict weekday junk restriction.`,
          tone: 'warning',
          category: 'system',
          icon: 'heart'
        });
      }
    }

    // ─── REMINDERS ENGINE ───
    if (settings.waterAlerts !== false) {
      const waterTarget = healthGoals.find(g => g.type === 'water')?.targetValue ?? 3500;
      if (todayHealth.totalWaterMl < waterTarget * 0.5) {
        list.unshift({
          id: 'health-water',
          title: 'Hydration Deficit Detected',
          message: `You've only consumed ${(todayHealth.totalWaterMl / 1000).toFixed(1)}L out of your ${waterTarget / 1000}L target. Keep the neural pathways lubricated!`,
          tone: 'warning',
          category: 'system',
          icon: 'droplets'
        });
      }
    }

    if (settings.proteinAlerts !== false) {
      const proteinTarget = healthGoals.find(g => g.type === 'protein')?.targetValue ?? 120;
      const totalProtein = todayHealth.meals.reduce((acc, m) => acc + (m.protein || 0), 0);
      const isEvening = new Date().getHours() >= 17;
      if (totalProtein < proteinTarget * 0.4 && isEvening) {
        list.push({
          id: 'health-protein-low',
          title: '⚠️ Protein Intake Low',
          message: `Only logged ${totalProtein}g of protein today. Reaching your target of ${proteinTarget}g is essential for muscle synthesis and recovery.`,
          tone: 'motivation',
          category: 'system',
          icon: 'flame'
        });
      }
    }

    if (settings.focusAlerts !== false) {
      const isWorkHours = new Date().getHours() >= 9 && new Date().getHours() <= 17;
      const completedFocusToday = focusSessions.filter(s => s.completed && s.date === today).length;
      if (completedFocusToday === 0 && isWorkHours) {
        list.push({
          id: 'prod-focus-reminder',
          title: '⚡ Start Focus Block',
          message: 'It is high-intensity prime time. Trigger a 25-minute Pomodoro block to enter deep cognitive flow.',
          tone: 'fun',
          category: 'system',
          icon: 'clock'
        });
      }
    }

    if (settings.streakAlerts !== false) {
      const isLateNight = new Date().getHours() >= 20;
      if (isLateNight) {
        const todayActivity = dailyActivity.find(a => a.date === today);
        const focusToday = todayActivity?.focusMinutes || 0;
        const readToday = todayActivity?.chaptersRead || 0;
        const codeToday = todayActivity?.problemsSolved || 0;
        
        if (focusStreak.currentStreak > 0 && focusToday === 0) {
          list.unshift({
            id: 'streak-risk-focus',
            title: '⚠️ Focus Streak at Risk',
            message: `Your ${focusStreak.currentStreak}-day focus streak resets in a few hours! Start a focus session now.`,
            tone: 'warning',
            category: 'system',
            icon: 'clock'
          });
        }
        if (readingStreak.currentStreak > 0 && readToday === 0) {
          list.unshift({
            id: 'streak-risk-reading',
            title: '⚠️ Reading Streak at Risk',
            message: `Your ${readingStreak.currentStreak}-day reading streak resets in a few hours! Toggle a chapter complete.`,
            tone: 'warning',
            category: 'system',
            icon: 'heart'
          });
        }
        if (codingStreak.currentStreak > 0 && codeToday === 0) {
          list.unshift({
            id: 'streak-risk-coding',
            title: '⚠️ Coding Streak at Risk',
            message: `Your ${codingStreak.currentStreak}-day coding streak resets in a few hours! Solve a LeetCode problem.`,
            tone: 'warning',
            category: 'system',
            icon: 'zap'
          });
        }
      }
    }

    if (settings.leetcodeAlerts !== false) {
      const todayActivity = dailyActivity.find(a => a.date === today);
      if ((todayActivity?.problemsSolved || 0) === 0) {
        list.push({
          id: 'prod-leetcode-alert',
          title: '💻 LeetCode Daily Forge',
          message: 'Keep your synapses sharp! Fire up the Forge and complete your daily algorithmic problem solving.',
          tone: 'motivation',
          category: 'system',
          icon: 'zap'
        });
      }
    }

    if (settings.workoutAlerts !== false) {
      const workoutTarget = healthGoals.find(g => g.type === 'workouts_per_week')?.targetValue ?? 45;
      if (todayHealth.totalWorkoutMinutes === 0) {
        list.push({
          id: 'health-workout',
          title: 'Active Engine Inertia',
          message: 'No physical activity logged today. Re-energize your system with a quick workout session.',
          tone: 'motivation',
          category: 'system',
          icon: 'dumbbell'
        });
      } else if (todayHealth.totalWorkoutMinutes >= workoutTarget) {
        list.unshift({
          id: 'health-workout-success',
          title: 'Cardio Threshold Cleared',
          message: `Outstanding! You achieved ${todayHealth.totalWorkoutMinutes}m of physical training today. Your cellular output is peaking.`,
          tone: 'success',
          category: 'system',
          icon: 'dumbbell'
        });
      }
    }

    // 3. Sleep quality check
    const sleepHrs = todayHealth.sleepEntry?.totalMinutes ? (todayHealth.sleepEntry.totalMinutes / 60) : 0;
    if (sleepHrs > 0 && sleepHrs < 6) {
      list.push({
        id: 'health-sleep',
        title: 'Rest Deficit Detected',
        message: `Logged only ${sleepHrs.toFixed(1)}h of rest. Protect your cognitive performance by planning an earlier sleep schedule tonight.`,
        tone: 'fun',
        category: 'system',
        icon: 'moon'
      });
    }

    return list.slice(0, 3);
  }, [weatherType, dailyActivity, readingStreak, codingStreak, focusStreak, todayHealth, healthGoals, settings, focusSessions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-violet-400" />
        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Contextual Pulse</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((n, i) => {
            const Icon = n.icon ? (ICON_MAP[n.icon] || Sparkles) : Sparkles;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: i * 0.1, type: 'spring', damping: 15 }}
                className="glass-card p-4 relative overflow-hidden group hover:border-white/20 transition-all"
              >
                <div className="flex gap-4 items-start relative z-10">
                  <div className={`p-2 rounded-xl bg-white/5 ${
                    n.tone === 'fun' ? 'text-pink-400' :
                    n.tone === 'motivation' ? 'text-amber-400' :
                    n.tone === 'success' ? 'text-emerald-400' :
                    n.tone === 'warning' ? 'text-rose-400' : 'text-blue-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                      {n.message}
                    </p>
                  </div>
                </div>
                
                {/* Background Accent */}
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 blur-3xl opacity-5 rounded-full bg-current ${
                  n.tone === 'fun' ? 'text-pink-400' :
                  n.tone === 'motivation' ? 'text-amber-400' :
                  n.tone === 'success' ? 'text-emerald-400' :
                  n.tone === 'warning' ? 'text-rose-400' : 'text-blue-400'
                }`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
