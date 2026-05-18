import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProblems } from './useLeetCodeQuery';
import { useBook } from './useBookQuery';
import { useFocusSessions } from './useFocusQuery';
import { useProfile } from './useProfileQuery';
import { useAchievements, useUpdateAchievement, achievementKeys } from './useAchievementQuery';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'react-hot-toast';
import { useSoundFX } from './useSoundFX';

export function useAchievementsEngine() {
  const { data: problems = [] } = useProblems();
  const { data: book } = useBook();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: profile } = useProfile();
  const { data: achievements = [] } = useAchievements();
  
  const updateAchievementMut = useUpdateAchievement();
  const { play } = useSoundFX();
  const qc = useQueryClient();

  // Keep a ref of currently updating achievements to avoid infinite rendering loop during concurrent mutations
  const updatingRefs = useRef<Set<string>>(new Set());
  const celebratedRefs = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (achievements.length === 0) return;

    const completedChapters = book?.chapters?.filter(c => c.completed).length ?? 0;
    const solvedProblems = problems.filter(p => p.completed).length;
    const hardProblems = problems.filter(p => p.completed && p.difficulty === 'Hard').length;
    const completedSessions = focusSessions.filter(s => s.completed).length;
    const totalFocusMinutes = focusSessions.filter(s => s.completed).reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);
    
    const readingStreakVal = profile?.readingStreak?.currentStreak ?? 0;
    const codingStreakVal = profile?.codingStreak?.currentStreak ?? 0;
    const focusStreakVal = profile?.focusStreak?.currentStreak ?? 0;

    achievements.forEach(async ach => {
      let progress = ach.progress || 0;
      let unlocked = ach.unlocked;

      switch (ach.id) {
        case 'first_chapter': progress = completedChapters; unlocked = completedChapters >= 1; break;
        case 'halfway_reader': progress = completedChapters; unlocked = completedChapters >= 25; break;
        case 'bookworm': progress = completedChapters; unlocked = completedChapters >= 51; break;
        case 'reading_streak_7': progress = readingStreakVal; unlocked = readingStreakVal >= 7; break;
        case 'first_solve': progress = solvedProblems; unlocked = solvedProblems >= 1; break;
        case 'ten_problems': progress = solvedProblems; unlocked = solvedProblems >= 10; break;
        case 'fifty_problems': progress = solvedProblems; unlocked = solvedProblems >= 50; break;
        case 'hard_solver': progress = hardProblems; unlocked = hardProblems >= 10; break;
        case 'sapling_starter': progress = completedSessions; unlocked = completedSessions >= 1; break;
        case 'deep_work_monk': progress = completedSessions; unlocked = completedSessions >= 25; break;
        case 'forest_guardian': progress = completedSessions; unlocked = completedSessions >= 100; break;
        case 'focus_machine': progress = totalFocusMinutes; unlocked = totalFocusMinutes >= 3000; break;
        case 'zen_master': progress = focusStreakVal; unlocked = focusStreakVal >= 30; break;
        case 'hundred_hour_club': progress = totalFocusMinutes; unlocked = totalFocusMinutes >= 6000; break;
        case 'coding_streak_7': progress = codingStreakVal; unlocked = codingStreakVal >= 7; break;
        case 'coding_streak_30': progress = codingStreakVal; unlocked = codingStreakVal >= 30; break;
      }

      // Detect difference and skip if already updating this key
      if (updatingRefs.current.has(ach.id)) return;

      const progressChanged = progress !== ach.progress;
      const newlyUnlocked = unlocked && !ach.unlocked;

      if (progressChanged || newlyUnlocked) {
        updatingRefs.current.add(ach.id);
        
        try {
          await updateAchievementMut.mutateAsync({
            id: ach.id,
            updates: {
              progress,
              unlocked,
              unlockedAt: newlyUnlocked ? new Date().toISOString().split('T')[0] : ach.unlockedAt,
            },
          });

          // Trigger visual celebration for newly unlocked achievement!
          if (newlyUnlocked && !celebratedRefs.current.has(ach.id)) {
            celebratedRefs.current.add(ach.id);
            play('achievement');
// Silent unlock - Claimable on achievements page
          }
        } catch (err) {
          console.error(`Failed to update achievement ${ach.id}:`, err);
        } finally {
          updatingRefs.current.delete(ach.id);
        }
      }
    });
  }, [problems, book, focusSessions, profile, achievements]);
}
