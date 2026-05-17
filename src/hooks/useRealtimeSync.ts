import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { healthKeys } from './useHealthQuery';
import { leetcodeKeys } from './useLeetCodeQuery';
import { focusKeys } from './useFocusQuery';
import { trackerKeys } from './useTrackerQuery';
import { bookKeys } from './useBookQuery';
import { achievementKeys } from './useAchievementQuery';
import { profileKeys } from './useProfileQuery';
import { activityKeys } from './useActivityQuery';

export function useRealtimeSync() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Build a real-time subscription channel
    const channel = supabase
      .channel('lifeos-realtime')
      // 1. Health Meals
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_meals', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.meals(user.id) });
      })
      // 2. Health Water
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_water', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.water(user.id) });
      })
      // 3. Health Workouts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_workouts', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.workouts(user.id) });
      })
      // 4. Health Sleep
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_sleep', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.sleep(user.id) });
      })
      // 5. Health Weight
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_weight', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.weight(user.id) });
      })
      // 6. Health Steps
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_steps', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.steps(user.id) });
      })
      // 7. Health Goals
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_goals', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.goals(user.id) });
      })
      // 8. Health Restrictions
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_restrictions', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: healthKeys.restrictions(user.id) });
      })
      // 9. LeetCode
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leetcode_problems', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: leetcodeKeys.all(user.id) });
      })
      // 10. Focus Sessions
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: focusKeys.all(user.id) });
      })
      // 11. Trackers
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trackers', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: trackerKeys.all(user.id) });
      })
      // 12. Tracker Items
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_items', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: trackerKeys.all(user.id) });
      })
      // 13. Achievements
      .on('postgres_changes', { event: '*', schema: 'public', table: 'achievements', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: achievementKeys.all(user.id) });
      })
      // 14. Books
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: bookKeys.all(user.id) });
      })
      // 15. Profile
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
      })
      // 16. Daily Activity
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_activity', filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: activityKeys.all(user.id) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
