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


-- ============================================================
-- ZERO-TRUST COMPANION SYNCHRONIZATION LEDGER
-- ============================================================

-- ─── 1. Extension API Keys Table ─────────────────────────────
create table if not exists public.extension_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  key_hash     text not null unique,
  device_name  text not null default 'Unknown Device',
  revoked      boolean not null default false,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_extension_keys_hash on public.extension_keys(key_hash);

alter table public.extension_keys enable row level security;
drop policy if exists "Users can manage own extension keys" on public.extension_keys;
create policy "Users can manage own extension keys" on public.extension_keys for all using (auth.uid() = user_id);


-- ─── 2. Immutable Event Ledger Table ─────────────────────────
create table if not exists public.sync_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_event_id   uuid not null unique,
  source            text not null check (source in ('companion_extension', 'web_dashboard', 'google_fit')),
  event_type        text not null check (event_type in ('focus_session_completed', 'leetcode_problem_solved', 'habit_completed', 'water_logged')),
  payload           jsonb not null,
  occurred_at       timestamptz not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_status text not null check (processing_status in ('pending', 'processed', 'failed', 'ignored')) default 'pending',
  error_message     text,
  schema_version    integer not null default 1
);

create index if not exists idx_sync_events_user_time on public.sync_events(user_id, occurred_at desc);
create index if not exists idx_sync_events_client_id on public.sync_events(client_event_id);
create index if not exists idx_sync_events_status on public.sync_events(processing_status);
create index if not exists idx_sync_events_type on public.sync_events(event_type);

alter table public.sync_events enable row level security;
drop policy if exists "Users own sync events" on public.sync_events;
create policy "Users own sync events" on public.sync_events for all using (auth.uid() = user_id);


-- ─── 3. Stored Procedure: Generate Scoped Key ────────────────
create or replace function public.create_extension_token(device_name text)
returns text language plpgsql security definer as $$
declare
  raw_token text;
  token_hash text;
begin
  -- Generate a secure cryptographically random token
  raw_token := 'ext_sync_v1_' || encode(gen_random_bytes(32), 'hex');
  -- SHA-256 hash of the token for storage
  token_hash := encode(digest(raw_token, 'sha256'), 'hex');

  insert into public.extension_keys (user_id, key_hash, device_name)
  values (auth.uid(), token_hash, coalesce(device_name, 'Companion Extension'));

  return raw_token;
end;
$$;


-- ─── 4. Stored Procedure: Ingest Scoped Event ────────────────
create or replace function public.submit_sync_event(
  client_event_id uuid,
  source text,
  event_type text,
  payload jsonb,
  occurred_at timestamptz,
  ext_token text
)
returns text language plpgsql security definer as $$
declare
  token_hash text;
  key_record record;
begin
  -- Hash the incoming token
  token_hash := encode(digest(ext_token, 'sha256'), 'hex');

  -- Verify key is valid and not revoked
  select * into key_record from public.extension_keys 
  where key_hash = token_hash and revoked = false;

  if not found then
    raise exception '401 Unauthorized: Invalid or revoked companion connection token';
  end if;

  -- Update last used timestamp
  update public.extension_keys 
  set last_used_at = now() 
  where id = key_record.id;

  -- Idempotent insert: if duplicate UUID exists, DO NOTHING
  insert into public.sync_events (
    user_id,
    client_event_id,
    source,
    event_type,
    payload,
    occurred_at,
    processing_status
  ) values (
    key_record.user_id,
    client_event_id,
    source,
    event_type,
    payload,
    occurred_at,
    'pending'
  )
  on conflict (client_event_id) do nothing;

  return 'success';
end;
$$;


-- ─── 5. Transactional Trigger Processor ───────────────────────
create or replace function public.process_sync_event_trigger()
returns trigger language plpgsql security definer as $$
declare
  target_date date;
  v_title text;
  v_slug text;
  v_diff text;
  v_duration integer;
  v_task text;
  v_theme text;
  v_ambience text;
  v_duplicate boolean;
  v_overlap boolean;
  xp_gain integer := 0;
  current_xp integer;
  daily_xp_earned integer;
  old_level integer;
  new_level integer;
  activity_record record;
  reading_cap integer;
  coding_cap integer;
  focus_cap integer;
  prod_score integer;
begin
  target_date := new.occurred_at::date;

  -- 1. Double Entry Check / Rate Limits (5,000 XP daily limit)
  select coalesce(sum(amount), 0) into daily_xp_earned
  from (
    -- Subquery checking ledger or event logs mapped to this date
    select 150 as amount from public.leetcode_problems where user_id = new.user_id and date = target_date
    union all
    select actual_duration * 10 as amount from public.focus_sessions where user_id = new.user_id and date = target_date
  ) x;

  if daily_xp_earned >= 5000 then
    update public.sync_events 
    set processing_status = 'ignored', error_message = 'Daily XP cap limit (5,000 XP) reached.'
    where id = new.id;
    return new;
  end if;

  -- 2. Process based on event types
  if new.event_type = 'leetcode_problem_solved' then
    -- Extract payload parameters
    v_title := coalesce(new.payload->>'title', 'LeetCode Problem');
    v_slug := coalesce(new.payload->>'slug', 'leetcode-problem');
    v_diff := coalesce(new.payload->>'difficulty', 'Medium');

    -- Heuristic validation: Deduplication on slug to block duplicate XP gains
    select exists (
      select 1 from public.leetcode_problems 
      where user_id = new.user_id 
        and (link like '%' || v_slug || '%' or name = v_title)
    ) into v_duplicate;

    if v_duplicate then
      update public.sync_events 
      set processing_status = 'ignored', error_message = 'Duplicate solve: Problem already logged.'
      where id = new.id;
      return new;
    end if;

    -- Map verified LeetCode Problem Solved event to public business table
    insert into public.leetcode_problems (
      user_id, date, name, link, difficulty, topic, status, completed, time_spent
    ) values (
      new.user_id,
      target_date,
      v_title,
      'https://leetcode.com/problems/' || v_slug || '/',
      v_diff,
      'Auto-Sync',
      'solved',
      true,
      coalesce((new.payload->>'timeSpent')::integer, 25)
    );

    xp_gain := 150;

    -- Update Daily Activity solving counter
    insert into public.daily_activity (user_id, date, problems_solved)
    values (new.user_id, target_date, 1)
    on conflict (user_id, date) do update
    set problems_solved = public.daily_activity.problems_solved + 1;

  elsif new.event_type = 'focus_session_completed' then
    v_duration := coalesce((new.payload->>'duration')::integer, 25);
    v_task := coalesce(new.payload->>'taskName', 'Focus Block');
    v_theme := coalesce(new.payload->>'growthTheme', 'tree');
    v_ambience := coalesce(new.payload->>'ambience', 'none');

    -- Heuristic checks
    if v_duration > 180 then
      update public.sync_events 
      set processing_status = 'failed', error_message = 'Session length exceeds safety maximum (180 minutes).'
      where id = new.id;
      return new;
    end if;

    -- Overlap prevention: verify if an active session exists in this range
    select exists (
      select 1 from public.focus_sessions
      where user_id = new.user_id
        and date = target_date
        and start_time < new.occurred_at
        and end_time > (new.occurred_at - (v_duration * interval '1 minute'))
    ) into v_overlap;

    if v_overlap then
      update public.sync_events 
      set processing_status = 'ignored', error_message = 'Focus session rejected due to time overlap with an existing block.'
      where id = new.id;
      return new;
    end if;

    -- Map verified Focus Session event to public business table
    insert into public.focus_sessions (
      user_id, date, start_time, end_time, duration, actual_duration, completed, failed, task_name, growth_theme, ambience, mode, productivity_score
    ) values (
      new.user_id,
      target_date,
      new.occurred_at - (v_duration * interval '1 minute'),
      new.occurred_at,
      v_duration,
      v_duration,
      true,
      false,
      v_task,
      v_theme,
      v_ambience,
      'focus',
      Math.min(100, Math.round((v_duration / 25.0) * 80.0 + 10.0))::integer
    );

    xp_gain := v_duration * 10;

    -- Update Daily Activity focus counter
    insert into public.daily_activity (user_id, date, focus_minutes)
    values (new.user_id, target_date, v_duration)
    on conflict (user_id, date) do update
    set focus_minutes = public.daily_activity.focus_minutes + v_duration;

  end if;

  -- 3. Calculate and Credit XP & Level up checks
  if xp_gain > 0 then
    -- Fetch profile
    select settings->>'xp' into current_xp from public.profiles where id = new.user_id;
    current_xp := coalesce(current_xp::integer, 0) + xp_gain;
    old_level := floor((current_xp - xp_gain) / 1000.0) + 1;
    new_level := floor(current_xp / 1000.0) + 1;

    -- Update profile settings JSON dynamically with the new XP
    update public.profiles
    set settings = jsonb_set(settings, '{xp}', to_jsonb(current_xp))
    where id = new.user_id;

    -- Generate Level Up system notification if needed
    if new_level > old_level then
      insert into public.notifications (
        user_id, title, message, category, priority, metadata
      ) values (
        new.user_id,
        'Operating System Level Up! 🏆',
        'Spectacular progress! You leveled up from Level ' || old_level || ' to Level ' || new_level || '!',
        'achievements',
        'high',
        jsonb_build_object('type', 'level_up', 'level', new_level)
      );
    end if;
  end if;

  -- 4. Re-calculate total daily productivity score based on the balanced engine
  select * into activity_record from public.daily_activity where user_id = new.user_id and date = target_date;
  if found then
    reading_cap := Math.min(activity_record.chapters_read * 15, 35);
    coding_cap := Math.min(activity_record.problems_solved * 20, 35);
    focus_cap := Math.min((activity_record.focus_minutes / 120.0) * 15.0, 15);
    prod_score := Math.min(100, Math.round(reading_cap + coding_cap + focus_cap));

    update public.daily_activity
    set productivity_score = prod_score
    where user_id = new.user_id and date = target_date;
  end if;

  -- Finalise event row state in Ledger
  update public.sync_events 
  set processing_status = 'processed', processed_at = now()
  where id = new.id;

  return new;
exception when others then
  -- Graceful transaction exception handling: Mark ledger as failed and log error reason
  update public.sync_events 
  set processing_status = 'failed', error_message = sqlerrm, processed_at = now()
  where id = new.id;
  return new;
end;
$$;

create or replace trigger on_sync_event_inserted
  after insert on public.sync_events
  for each row
  when (new.processing_status = 'pending')
  execute function public.process_sync_event_trigger();


-- Enable Realtime Replication for Scoped Connection Ledger
alter publication supabase_realtime add table public.sync_events;
alter publication supabase_realtime add table public.extension_keys;


-- ============================================================
-- PREMIUM IN-APP FEEDBACK & SECURE BUG REPORTING SYSTEM
-- ============================================================

-- ─── 1. Bug Reports Database Table ───────────────────────────
create table if not exists public.bug_reports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('Bug', 'Feature Request', 'UX Improvement', 'Performance Issue', 'Wrong Data Sync', 'Other')),
  severity       text not null check (severity in ('Minor', 'Medium', 'Critical')) default 'Minor',
  title          text not null,
  description    text not null,
  metadata       jsonb not null default '{}',
  screenshot_url text,
  status         text not null check (status in ('open', 'triaged', 'in_progress', 'fixed', 'closed')) default 'open',
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists idx_bug_reports_user on public.bug_reports(user_id);
create index if not exists idx_bug_reports_status on public.bug_reports(status);

alter table public.bug_reports enable row level security;
drop policy if exists "Users own bug reports" on public.bug_reports;
create policy "Users own bug reports" on public.bug_reports for all using (auth.uid() = user_id);


-- ─── 2. Secure Ingestion RPC with Abuse Protection ──────────
create or replace function public.submit_bug_report(
  type text,
  severity text,
  title text,
  description text,
  metadata jsonb,
  screenshot_url text
)
returns text language plpgsql security definer as $$
declare
  report_count integer;
begin
  -- Validate required fields
  if trim(title) = '' or trim(description) = '' then
    raise exception '400 Bad Request: Title and description are required.';
  end if;

  -- Abuse Protection Heuristic: Hard rate limit of 10 bug reports per user per 24 hours
  select count(*) into report_count 
  from public.bug_reports 
  where user_id = auth.uid() and created_at > now() - interval '24 hours';

  if report_count >= 10 then
    raise exception '429 Too Many Requests: Daily bug reporting quota exceeded. Max 10 submissions per 24 hours.';
  end if;

  -- Write validated event to reporting ledger
  insert into public.bug_reports (
    user_id,
    type,
    severity,
    title,
    description,
    metadata,
    screenshot_url,
    status
  ) values (
    auth.uid(),
    type,
    severity,
    title,
    description,
    metadata,
    screenshot_url,
    'open'
  );

  return 'success';
end;
$$;


-- Enable Realtime Replication for Bug Reports Ledger
alter publication supabase_realtime add table public.bug_reports;



