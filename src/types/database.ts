// ─── Supabase Database Type Definitions ──────────────────────────────────────
// Auto-generated shapes matching the SQL schema in supabase/schema.sql
// Update this file whenever the schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          settings: Json;
          pomodoro_settings: Json;
          reminder_settings: Json;
          reading_streak: Json;
          coding_streak: Json;
          focus_streak: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string;
          chapters: Json;
          start_date: string | null;
          target_end_date: string | null;
          cover_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['books']['Insert']>;
      };

      leetcode_problems: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          name: string;
          link: string;
          difficulty: 'Easy' | 'Medium' | 'Hard';
          topic: string;
          status: 'solved' | 'attempted' | 'todo';
          completed: boolean;
          notes: string | null;
          time_spent: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leetcode_problems']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['leetcode_problems']['Insert']>;
      };

      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string | null;
          duration: number;
          actual_duration: number | null;
          completed: boolean;
          failed: boolean;
          task_name: string | null;
          task_tags: string[] | null;
          growth_theme: string;
          ambience: string;
          reflection: string | null;
          mood: string | null;
          productivity_score: number | null;
          mode: 'focus' | 'short_break' | 'long_break';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['focus_sessions']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['focus_sessions']['Insert']>;
      };

      daily_activity: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          chapters_read: number;
          problems_solved: number;
          focus_minutes: number;
          productivity_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_activity']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_activity']['Insert']>;
      };

      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          domain: string;
          schedule_type: string;
          scheduled_at: string;
          recurrence: string;
          status: string;
          enabled: boolean;
          completed: boolean;
          snoozed_until: string | null;
          last_triggered_at: string | null;
          smart_rules: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          category: string;
          timestamp: string;
          read: boolean;
          action_url: string | null;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          expires_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };

      trackers: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          icon: string;
          color: string;
          type: string;
          category: string | null;
          target: number | null;
          unit: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trackers']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trackers']['Insert']>;
      };

      tracker_items: {
        Row: {
          id: string;
          tracker_id: string;
          user_id: string;
          title: string;
          status: 'completed' | 'not_started' | 'skipped';
          date_completed: string | null;
          value: number | null;
          notes: string | null;
          meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tracker_items']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tracker_items']['Insert']>;
      };

      app_links: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          url: string;
          description: string | null;
          icon_type: string;
          icon_value: string;
          favicon: string | null;
          color: string | null;
          category: string;
          tags: string[] | null;
          visit_count: number;
          launch_count_today: number;
          last_visited: string | null;
          is_pinned: boolean;
          is_favorite: boolean;
          is_hidden: boolean;
          sort_order: number | null;
          open_mode: 'same-tab' | 'new-tab';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['app_links']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['app_links']['Insert']>;
      };

      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked: boolean;
          unlocked_at: string | null;
          progress: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['achievements']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['achievements']['Insert']>;
      };

      // ─── Health Tables ────────────────────────────────────────────────────
      health_meals: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          time: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'custom';
          name: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number | null;
          quantity: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_meals']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_meals']['Insert']>;
      };

      health_water: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          time: string;
          amount: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_water']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['health_water']['Insert']>;
      };

      health_workouts: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          start_time: string;
          name: string;
          type: string;
          duration_minutes: number;
          calories_burned: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_workouts']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_workouts']['Insert']>;
      };

      health_sleep: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          sleep_time: string;
          wake_time: string;
          total_minutes: number;
          quality: number;
          energy_level: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_sleep']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_sleep']['Insert']>;
      };

      health_weight: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight: number;
          body_fat_percent: number | null;
          waist_cm: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_weight']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['health_weight']['Insert']>;
      };

      health_steps: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          steps: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_steps']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_steps']['Insert']>;
      };

      health_goals: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          type: string;
          target_value: number;
          unit: string;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_goals']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_goals']['Insert']>;
      };

      health_restrictions: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          type: string;
          limit_value: number;
          unit: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['health_restrictions']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['health_restrictions']['Insert']>;
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
