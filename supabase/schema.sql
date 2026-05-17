-- ============================================================
-- Life OS Dashboard — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- (Project → SQL Editor → New query → Paste → Run)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- One row per user. Stores settings blobs + streaks.
-- ============================================================
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  -- UserSettings JSON blob (theme, accentColor, mood, etc.)
  settings        jsonb not null default '{}',
  -- PomodoroSettings JSON blob
  pomodoro_settings jsonb not null default '{}',
  -- ReminderSettings JSON blob
  reminder_settings jsonb not null default '{}',
  -- StreakData blobs
  reading_streak  jsonb not null default '{"currentStreak":0,"longestStreak":0,"history":{}}',
  coding_streak   jsonb not null default '{"currentStreak":0,"longestStreak":0,"history":{}}',
  focus_streak    jsonb not null default '{"currentStreak":0,"longestStreak":0,"history":{}}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

alter table profiles enable row level security;
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- BOOKS + CHAPTERS
-- Chapters stored as JSONB array in books.chapters for
-- simplicity (chapters are always fetched with the book).
-- ============================================================
create table if not exists books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  author          text not null,
  -- Full Chapter[] JSON array
  chapters        jsonb not null default '[]',
  start_date      date,
  target_end_date date,
  cover_color     text not null default '#7c3aed',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_books_user on books(user_id);
drop trigger if exists books_updated_at on books;
create trigger books_updated_at before update on books
  for each row execute function update_updated_at_column();

alter table books enable row level security;
drop policy if exists "Users own books" on books;
create policy "Users own books" on books for all using (auth.uid() = user_id);


-- ============================================================
-- LEETCODE PROBLEMS
-- ============================================================
create table if not exists leetcode_problems (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  name            text not null,
  link            text not null default '',
  difficulty      text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  topic           text not null default '',
  status          text not null check (status in ('solved', 'attempted', 'todo')) default 'todo',
  completed       boolean not null default false,
  notes           text,
  time_spent      integer,  -- minutes
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_leetcode_user_date on leetcode_problems(user_id, date);
drop trigger if exists leetcode_updated_at on leetcode_problems;
create trigger leetcode_updated_at before update on leetcode_problems
  for each row execute function update_updated_at_column();

alter table leetcode_problems enable row level security;
drop policy if exists "Users own problems" on leetcode_problems;
create policy "Users own problems" on leetcode_problems for all using (auth.uid() = user_id);


-- ============================================================
-- FOCUS SESSIONS
-- ============================================================
create table if not exists focus_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  start_time        timestamptz not null,
  end_time          timestamptz,
  duration          integer not null,          -- planned minutes
  actual_duration   integer,                   -- actual minutes
  completed         boolean not null default false,
  failed            boolean not null default false,
  task_name         text,
  task_tags         text[],
  growth_theme      text not null default 'tree',
  ambience          text not null default 'none',
  reflection        text,
  mood              text,
  productivity_score integer check (productivity_score between 0 and 100),
  mode              text not null check (mode in ('focus', 'short_break', 'long_break')) default 'focus',
  created_at        timestamptz not null default now()
);

create index if not exists idx_focus_user_date on focus_sessions(user_id, date);

alter table focus_sessions enable row level security;
drop policy if exists "Users own focus sessions" on focus_sessions;
create policy "Users own focus sessions" on focus_sessions for all using (auth.uid() = user_id);


-- ============================================================
-- DAILY ACTIVITY
-- ============================================================
create table if not exists daily_activity (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  chapters_read     integer not null default 0,
  problems_solved   integer not null default 0,
  focus_minutes     integer not null default 0,
  productivity_score integer not null default 0 check (productivity_score between 0 and 100),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_activity_user_date on daily_activity(user_id, date);
drop trigger if exists daily_activity_updated_at on daily_activity;
create trigger daily_activity_updated_at before update on daily_activity
  for each row execute function update_updated_at_column();

alter table daily_activity enable row level security;
drop policy if exists "Users own daily activity" on daily_activity;
create policy "Users own daily activity" on daily_activity for all using (auth.uid() = user_id);


-- ============================================================
-- REMINDERS
-- ============================================================
create table if not exists reminders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  message           text not null default '',
  domain            text not null,
  schedule_type     text not null check (schedule_type in ('one-time', 'recurring', 'smart')),
  scheduled_at      timestamptz not null,
  recurrence        text not null default 'none',
  status            text not null check (status in ('active', 'snoozed', 'completed', 'disabled')) default 'active',
  enabled           boolean not null default true,
  completed         boolean not null default false,
  snoozed_until     timestamptz,
  last_triggered_at timestamptz,
  smart_rules       jsonb,
  metadata          jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_reminders_user on reminders(user_id);
drop trigger if exists reminders_updated_at on reminders;
create trigger reminders_updated_at before update on reminders
  for each row execute function update_updated_at_column();

alter table reminders enable row level security;
drop policy if exists "Users own reminders" on reminders;
create policy "Users own reminders" on reminders for all using (auth.uid() = user_id);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  message     text not null default '',
  category    text not null,
  timestamp   timestamptz not null default now(),
  read        boolean not null default false,
  action_url  text,
  priority    text not null check (priority in ('low', 'normal', 'high', 'urgent')) default 'normal',
  expires_at  timestamptz,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_id, read);
drop trigger if exists notifications_updated_at on notifications;
create trigger notifications_updated_at before update on notifications
  for each row execute function update_updated_at_column();

alter table notifications enable row level security;
drop policy if exists "Users own notifications" on notifications;
create policy "Users own notifications" on notifications for all using (auth.uid() = user_id);


-- ============================================================
-- TRACKERS + TRACKER ITEMS
-- ============================================================
create table if not exists trackers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  icon        text not null default '📊',
  color       text not null default '#8b5cf6',
  type        text not null,
  category    text,
  target      numeric,
  unit        text,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_trackers_user on trackers(user_id);
drop trigger if exists trackers_updated_at on trackers;
create trigger trackers_updated_at before update on trackers
  for each row execute function update_updated_at_column();

alter table trackers enable row level security;
drop policy if exists "Users own trackers" on trackers;
create policy "Users own trackers" on trackers for all using (auth.uid() = user_id);


create table if not exists tracker_items (
  id             uuid primary key default gen_random_uuid(),
  tracker_id     uuid not null references trackers(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  status         text not null check (status in ('completed', 'not_started', 'skipped')) default 'not_started',
  date_completed date,
  value          numeric,
  notes          text,
  meta           jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_tracker_items_tracker on tracker_items(tracker_id);
drop trigger if exists tracker_items_updated_at on tracker_items;
create trigger tracker_items_updated_at before update on tracker_items
  for each row execute function update_updated_at_column();

alter table tracker_items enable row level security;
drop policy if exists "Users own tracker items" on tracker_items;
create policy "Users own tracker items" on tracker_items for all using (auth.uid() = user_id);


-- ============================================================
-- APP LINKS (Launcher)
-- ============================================================
create table if not exists app_links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  url               text not null,
  description       text,
  icon_type         text not null default 'lucide',
  icon_value        text not null,
  favicon           text,
  color             text,
  category          text not null default 'other',
  tags              text[],
  visit_count       integer not null default 0,
  launch_count_today integer not null default 0,
  last_visited      timestamptz,
  is_pinned         boolean not null default false,
  is_favorite       boolean not null default false,
  is_hidden         boolean not null default false,
  sort_order        integer,
  open_mode         text not null check (open_mode in ('same-tab', 'new-tab')) default 'new-tab',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_app_links_user on app_links(user_id);
drop trigger if exists app_links_updated_at on app_links;
create trigger app_links_updated_at before update on app_links
  for each row execute function update_updated_at_column();

alter table app_links enable row level security;
drop policy if exists "Users own app links" on app_links;
create policy "Users own app links" on app_links for all using (auth.uid() = user_id);


-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table if not exists achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,           -- matches the static id in lib/data.ts
  unlocked       boolean not null default false,
  unlocked_at    date,
  progress       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index if not exists idx_achievements_user on achievements(user_id);
drop trigger if exists achievements_updated_at on achievements;
create trigger achievements_updated_at before update on achievements
  for each row execute function update_updated_at_column();

alter table achievements enable row level security;
drop policy if exists "Users own achievements" on achievements;
create policy "Users own achievements" on achievements for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — MEALS
-- ============================================================
create table if not exists health_meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  time        time not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks', 'custom')),
  name        text not null,
  calories    integer not null default 0,
  protein     numeric(7,2) not null default 0,
  carbs       numeric(7,2) not null default 0,
  fat         numeric(7,2) not null default 0,
  fiber       numeric(7,2),
  quantity    text,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_meals_user_date on health_meals(user_id, date);
drop trigger if exists health_meals_updated_at on health_meals;
create trigger health_meals_updated_at before update on health_meals
  for each row execute function update_updated_at_column();

alter table health_meals enable row level security;
drop policy if exists "Users own meals" on health_meals;
create policy "Users own meals" on health_meals for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — WATER
-- ============================================================
create table if not exists health_water (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  time        time not null,
  amount      integer not null,   -- ml
  created_at  timestamptz not null default now()
);

create index if not exists idx_water_user_date on health_water(user_id, date);

alter table health_water enable row level security;
drop policy if exists "Users own water logs" on health_water;
create policy "Users own water logs" on health_water for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — WORKOUTS
-- ============================================================
create table if not exists health_workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  name             text not null,
  type             text not null,
  duration_minutes integer not null,
  calories_burned  integer,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_workouts_user_date on health_workouts(user_id, date);
drop trigger if exists health_workouts_updated_at on health_workouts;
create trigger health_workouts_updated_at before update on health_workouts
  for each row execute function update_updated_at_column();

alter table health_workouts enable row level security;
drop policy if exists "Users own workouts" on health_workouts;
create policy "Users own workouts" on health_workouts for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — SLEEP
-- ============================================================
create table if not exists health_sleep (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,          -- wake-up day
  sleep_time    time not null,          -- could be prev night
  wake_time     time not null,
  total_minutes integer not null,
  quality       smallint not null check (quality between 1 and 5),
  energy_level  smallint check (energy_level between 1 and 5),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, date)               -- one sleep entry per day
);

create index if not exists idx_sleep_user_date on health_sleep(user_id, date);
drop trigger if exists health_sleep_updated_at on health_sleep;
create trigger health_sleep_updated_at before update on health_sleep
  for each row execute function update_updated_at_column();

alter table health_sleep enable row level security;
drop policy if exists "Users own sleep entries" on health_sleep;
create policy "Users own sleep entries" on health_sleep for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — WEIGHT
-- ============================================================
create table if not exists health_weight (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  weight           numeric(5,2) not null,   -- kg
  body_fat_percent numeric(5,2),
  waist_cm         numeric(5,2),
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_weight_user_date on health_weight(user_id, date desc);

alter table health_weight enable row level security;
drop policy if exists "Users own weight logs" on health_weight;
create policy "Users own weight logs" on health_weight for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — STEPS
-- ============================================================
create table if not exists health_steps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  steps       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_steps_user_date on health_steps(user_id, date);
drop trigger if exists health_steps_updated_at on health_steps;
create trigger health_steps_updated_at before update on health_steps
  for each row execute function update_updated_at_column();

alter table health_steps enable row level security;
drop policy if exists "Users own step logs" on health_steps;
create policy "Users own step logs" on health_steps for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — GOALS
-- ============================================================
create table if not exists health_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null,
  type         text not null,
  target_value numeric not null,
  unit         text not null,
  deadline     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_health_goals_user on health_goals(user_id);
drop trigger if exists health_goals_updated_at on health_goals;
create trigger health_goals_updated_at before update on health_goals
  for each row execute function update_updated_at_column();

alter table health_goals enable row level security;
drop policy if exists "Users own health goals" on health_goals;
create policy "Users own health goals" on health_goals for all using (auth.uid() = user_id);


-- ============================================================
-- HEALTH — RESTRICTIONS
-- ============================================================
create table if not exists health_restrictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  type        text not null,
  limit_value numeric not null,
  unit        text not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_health_restrictions_user on health_restrictions(user_id);
drop trigger if exists health_restrictions_updated_at on health_restrictions;
create trigger health_restrictions_updated_at before update on health_restrictions
  for each row execute function update_updated_at_column();

alter table health_restrictions enable row level security;
drop policy if exists "Users own health restrictions" on health_restrictions;
create policy "Users own health restrictions" on health_restrictions for all using (auth.uid() = user_id);


-- ============================================================
-- DONE
-- All tables created with RLS enabled. 
-- Enable Google Auth in: Supabase → Authentication → Providers
-- ============================================================


-- ============================================================
-- SUPABASE REALTIME REPLICATION
-- Enable Realtime for all our sync tables
-- ============================================================
alter publication supabase_realtime add table health_meals;
alter publication supabase_realtime add table health_water;
alter publication supabase_realtime add table health_workouts;
alter publication supabase_realtime add table health_sleep;
alter publication supabase_realtime add table health_weight;
alter publication supabase_realtime add table health_steps;
alter publication supabase_realtime add table health_goals;
alter publication supabase_realtime add table health_restrictions;
alter publication supabase_realtime add table leetcode_problems;
alter publication supabase_realtime add table focus_sessions;
alter publication supabase_realtime add table trackers;
alter publication supabase_realtime add table tracker_items;
alter publication supabase_realtime add table achievements;
alter publication supabase_realtime add table books;
alter publication supabase_realtime add table daily_activity;
alter publication supabase_realtime add table profiles;

