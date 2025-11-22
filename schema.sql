-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  
  -- Stats
  level int default 1,
  exp int default 0,
  exp_to_next_level int default 100,
  streak_current int default 0,
  streak_best int default 0,
  streak_freeze_count int default 0,
  
  -- Physical Stats (from onboarding)
  gender text,
  age int,
  height numeric, -- in cm
  weight numeric, -- in kg
  target_weight numeric,
  activity_level text,
  fitness_level text,
  focus_area text,
  workout_reason text,
  
  -- Settings
  workout_days text[], -- Array of days e.g. ['MON', 'WED', 'FRI']
  workout_time time,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Exercises Encyclopedia
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  muscle_group text, -- e.g., 'Chest', 'Legs'
  difficulty text, -- 'Beginner', 'Intermediate', 'Advanced'
  type text, -- 'Strength', 'Cardio'
  equipment_needed text[],
  image_url text,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workout Plans
create table public.workout_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null, -- e.g., 'My Custom Plan', 'Generated Plan'
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workout Plan Items (Exercises in a plan)
create table public.plan_exercises (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references public.workout_plans(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  sets int default 3,
  reps int default 10,
  rest_seconds int default 60,
  day_of_week text, -- 'MON', 'TUE' etc. or null if flexible
  order_index int default 0
);

-- Workout Sessions (History)
create table public.workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  plan_id uuid references public.workout_plans(id),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  status text default 'in_progress', -- 'completed', 'abandoned'
  exp_earned int default 0
);

-- Session Logs (Sets performed)
create table public.session_logs (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  set_number int not null,
  reps_completed int,
  weight_kg numeric,
  completed_at timestamp with time zone default timezone('utc'::text, now())
);

-- Shop Items
create table public.shop_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  cost_exp int not null,
  type text not null, -- 'streak_freeze', 'cosmetic', 'badge'
  image_url text
);

-- User Inventory
create table public.inventory (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  item_id uuid references public.shop_items(id) not null,
  quantity int default 1,
  acquired_at timestamp with time zone default timezone('utc'::text, now())
);

-- Insert some default shop items
insert into public.shop_items (name, description, cost_exp, type) values
('Streak Freeze', 'Prevents your streak from resetting if you miss a day.', 500, 'streak_freeze');

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add reminders_enabled to profiles if not exists (using a safe alter command approach for SQL script)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'reminders_enabled') then
    alter table public.profiles add column reminders_enabled boolean default false;
  end if;
end $$;

-- Seed Exercises
insert into public.exercises (name, description, muscle_group, difficulty, type, equipment_needed) values
('Push-ups', 'A classic upper body exercise.', 'Chest', 'Beginner', 'Strength', '{}'),
('Squats', 'Fundamental lower body exercise.', 'Legs', 'Beginner', 'Strength', '{}'),
('Lunges', 'Great for legs and glutes.', 'Legs', 'Beginner', 'Strength', '{}'),
('Plank', 'Core stability exercise.', 'Core', 'Beginner', 'Strength', '{}'),
('Jumping Jacks', 'Full body cardio.', 'Full Body', 'Beginner', 'Cardio', '{}'),
('Burpees', 'Intense full body exercise.', 'Full Body', 'Intermediate', 'Cardio', '{}'),
('Pull-ups', 'Upper body strength.', 'Back', 'Intermediate', 'Strength', '{"Pull-up Bar"}'),
('Dumbbell Rows', 'Back strengthening.', 'Back', 'Beginner', 'Strength', '{"Dumbbells"}'),
('Mountain Climbers', 'Core and cardio.', 'Core', 'Intermediate', 'Cardio', '{}'),
('Sit-ups', 'Abdominal exercise.', 'Core', 'Beginner', 'Strength', '{}')
on conflict do nothing; -- Prevent duplicates if run multiple times

