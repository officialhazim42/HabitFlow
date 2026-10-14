-- ==============================================================================
-- HabitFlow — Supabase Database Schema & Row Level Security (RLS) Policies
-- Author: Hazim Bashir (حازم بشیر)
-- Architecture: Template-Enforced Predefined Daily Habits (No Custom Habits)
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. Profiles Table (Linked to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  has_onboarded boolean default false,
  theme_preference text default 'dark',
  accent_preference text default 'emerald',
  timezone_preference text default 'auto',
  week_start_preference text default 'Mon',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Schema migration columns if table already exists
alter table public.profiles add column if not exists has_onboarded boolean default false;
alter table public.profiles add column if not exists theme_preference text default 'dark';
alter table public.profiles add column if not exists accent_preference text default 'emerald';
alter table public.profiles add column if not exists timezone_preference text default 'auto';
alter table public.profiles add column if not exists week_start_preference text default 'Mon';

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Trigger: Automatically create or update public.profiles on auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, has_onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    false
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 3. Predefined Habit Templates Table
-- ------------------------------------------------------------------------------
create table if not exists public.predefined_habits (
  slug text primary key,
  name text not null,
  description text not null,
  category text not null,
  default_reminder_time text default '08:00',
  sort_order int not null
);

-- Enable RLS on predefined_habits
alter table public.predefined_habits enable row level security;

-- Predefined habits are public read-only for authenticated sessions
create policy "Authenticated users can read predefined habits"
  on public.predefined_habits
  for select
  using (true);

-- Seed Canonical 9 Predefined Habits
insert into public.predefined_habits (slug, name, description, category, default_reminder_time, sort_order)
values
  ('wake-up-on-time', 'Wake Up on Time', 'Start the day according to your planned schedule.', 'Personal Development', '07:00', 1),
  ('drink-water', 'Drink Water', 'Maintain regular water intake throughout the day.', 'Health', '08:00', 2),
  ('morning-exercise', 'Morning Exercise', 'Complete a short workout, stretching session, or walk.', 'Fitness', '09:00', 3),
  ('read-20-minutes', 'Read for 20 Minutes', 'Spend time reading a book or educational material.', 'Learning', '20:00', 4),
  ('study-focused-work', 'Study or Focused Work', 'Complete a focused session on an important task.', 'Productivity', '10:00', 5),
  ('take-screen-break', 'Take a Screen Break', 'Take a short break from screens during the day.', 'Health', '14:00', 6),
  ('review-daily-goals', 'Review Daily Goals', 'Review the tasks and priorities planned for the day.', 'Productivity', '18:30', 7),
  ('plan-tomorrow', 'Plan Tomorrow', 'Review unfinished tasks and prepare for the next day.', 'Personal Development', '21:30', 8),
  ('maintain-sleep-schedule', 'Maintain a Sleep Schedule', 'Follow a consistent bedtime routine.', 'Sleep', '22:30', 9)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  default_reminder_time = excluded.default_reminder_time,
  sort_order = excluded.sort_order;


-- ------------------------------------------------------------------------------
-- 4. User Habits Table (Restricted to Predefined Templates Only)
-- ------------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template_slug text references public.predefined_habits(slug),
  name text not null,
  description text default '',
  category text default 'General',
  frequency text default 'Every day',
  scheduled_days text[] default array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  start_date date default current_date,
  reminder_time text,
  reminder_enabled boolean default true,
  is_archived boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_template unique (user_id, template_slug),
  constraint valid_template_check check (
    template_slug in (
      'wake-up-on-time',
      'drink-water',
      'morning-exercise',
      'read-20-minutes',
      'study-focused-work',
      'take-screen-break',
      'review-daily-goals',
      'plan-tomorrow',
      'maintain-sleep-schedule'
    )
  )
);

-- Schema migration columns if table already exists
alter table public.habits add column if not exists template_slug text;
alter table public.habits add column if not exists frequency text default 'Every day';
alter table public.habits add column if not exists scheduled_days text[] default array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
alter table public.habits add column if not exists start_date date default current_date;
alter table public.habits add column if not exists reminder_time text;
alter table public.habits add column if not exists reminder_enabled boolean default true;
alter table public.habits add column if not exists is_archived boolean default false;
alter table public.habits add column if not exists target_quantity text default null;
alter table public.habits add column if not exists custom_days text[] default null;
alter table public.habits add column if not exists target_days_per_week int default 7;

-- Schema migration: drop valid_template_check if exists so custom habits are allowed
alter table public.habits drop constraint if exists valid_template_check;

-- Enable RLS on habits
alter table public.habits enable row level security;

-- Habits Policy: Users can view their own habits
drop policy if exists "Users can view their own habits" on public.habits;
create policy "Users can view their own habits"
  on public.habits
  for select
  using (auth.uid() = user_id);

-- Habits Policy: Users can create their own starter or custom habits
drop policy if exists "Users can create their own habits" on public.habits;
drop policy if exists "Users can provision predefined habits only" on public.habits;
create policy "Users can create their own habits"
  on public.habits
  for insert
  with check (auth.uid() = user_id);

-- Habits Policy: Users can update their own habits
drop policy if exists "Users can update their own habits" on public.habits;
drop policy if exists "Users can update their own habit settings" on public.habits;
create policy "Users can update their own habits"
  on public.habits
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Habits Policy: Users can delete their own habits
drop policy if exists "Users can delete their own habits" on public.habits;
create policy "Users can delete their own habits"
  on public.habits
  for delete
  using (auth.uid() = user_id);

-- Performance Indexes
create index if not exists habits_user_id_idx on public.habits(user_id);
create index if not exists habits_template_idx on public.habits(user_id, template_slug);
create index if not exists habits_created_at_idx on public.habits(created_at desc);
create index if not exists habits_archived_idx on public.habits(user_id, is_archived);


-- ------------------------------------------------------------------------------
-- 5. Habit Completions Table (Daily check-ins)
-- ------------------------------------------------------------------------------
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_habit_date unique (habit_id, completed_date)
);

-- Enable RLS on habit_completions
alter table public.habit_completions enable row level security;

-- Completions Policies
drop policy if exists "Users can view their own habit completions" on public.habit_completions;
create policy "Users can view their own habit completions"
  on public.habit_completions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark habit completions" on public.habit_completions;
create policy "Users can mark habit completions"
  on public.habit_completions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete (undo) habit completions" on public.habit_completions;
create policy "Users can delete (undo) habit completions"
  on public.habit_completions
  for delete
  using (auth.uid() = user_id);

-- Performance Indexes
create index if not exists habit_completions_user_habit_idx on public.habit_completions(user_id, habit_id);
create index if not exists habit_completions_date_idx on public.habit_completions(completed_date);


-- ------------------------------------------------------------------------------
-- 6. Daily Reflections Table
-- ------------------------------------------------------------------------------
create table if not exists public.daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reflection_date date not null,
  went_well text default '',
  struggled_with text default '',
  improve_tomorrow text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_reflection_date unique (user_id, reflection_date)
);

-- Enable RLS on daily_reflections
alter table public.daily_reflections enable row level security;

-- Daily Reflections Policies
drop policy if exists "Users can view their own daily reflections" on public.daily_reflections;
create policy "Users can view their own daily reflections"
  on public.daily_reflections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily reflections" on public.daily_reflections;
create policy "Users can insert their own daily reflections"
  on public.daily_reflections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily reflections" on public.daily_reflections;
create policy "Users can update their own daily reflections"
  on public.daily_reflections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own daily reflections" on public.daily_reflections;
create policy "Users can delete their own daily reflections"
  on public.daily_reflections
  for delete
  using (auth.uid() = user_id);

-- Performance Indexes
create index if not exists daily_reflections_user_date_idx on public.daily_reflections(user_id, reflection_date);

