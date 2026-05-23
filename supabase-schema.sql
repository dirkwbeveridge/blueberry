create extension if not exists "uuid-ossp";

create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  invite_code text unique not null,
  due_date date,
  stage text not null default 'pregnant' check (stage in ('ttc', 'pregnant', 'postpartum')),
  baby_name text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  role text not null check (role in ('mother', 'partner')),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (household_id, role)
);

create table if not exists health_logs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  symptoms text[],
  mood text,
  energy_level int check (energy_level between 1 and 5),
  notes text,
  weight_kg numeric(5,2)
);

create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  appointment_date timestamptz not null,
  location text,
  notes text,
  google_event_id text,
  created_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  title text not null,
  is_done boolean not null default false,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now()
);

create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  week_number int,
  content text not null,
  milestone_tag text,
  media_urls text[],
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  week_number int,
  title text not null,
  occurred_at timestamptz,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists kick_sessions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  kick_count int not null default 0,
  duration_secs int,
  notes text
);

create table if not exists contraction_sessions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  contractions jsonb not null default '[]'::jsonb,
  notes text
);

create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.users where id = auth.uid()
$$;

create or replace function public.household_member_count(target_household_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.users where household_id = target_household_id
$$;

alter table households enable row level security;
alter table users enable row level security;
alter table health_logs enable row level security;
alter table appointments enable row level security;
alter table todos enable row level security;
alter table journal_entries enable row level security;
alter table milestones enable row level security;
alter table kick_sessions enable row level security;
alter table contraction_sessions enable row level security;

create policy "select own household" on households
  for select using (id = public.get_my_household_id());

create policy "insert household when signed in" on households
  for insert with check (auth.uid() is not null);

create policy "update own household" on households
  for update using (id = public.get_my_household_id())
  with check (id = public.get_my_household_id());

create policy "select household users" on users
  for select using (household_id = public.get_my_household_id());

create policy "insert own user under two member cap" on users
  for insert with check (
    id = auth.uid()
    and public.household_member_count(household_id) < 2
  );

create policy "update own user" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "health household select" on health_logs
  for select using (household_id = public.get_my_household_id());
create policy "health household insert" on health_logs
  for insert with check (household_id = public.get_my_household_id());
create policy "health household update" on health_logs
  for update using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());
create policy "health household delete" on health_logs
  for delete using (household_id = public.get_my_household_id());

create policy "appointments household select" on appointments
  for select using (household_id = public.get_my_household_id());
create policy "appointments household insert" on appointments
  for insert with check (household_id = public.get_my_household_id());
create policy "appointments household update" on appointments
  for update using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());
create policy "appointments household delete" on appointments
  for delete using (household_id = public.get_my_household_id());

create policy "todos household select" on todos
  for select using (household_id = public.get_my_household_id());
create policy "todos household insert" on todos
  for insert with check (household_id = public.get_my_household_id());
create policy "todos household update" on todos
  for update using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());
create policy "todos household delete" on todos
  for delete using (household_id = public.get_my_household_id());

create policy "journal household select" on journal_entries
  for select using (household_id = public.get_my_household_id());
create policy "journal household insert" on journal_entries
  for insert with check (household_id = public.get_my_household_id());
create policy "journal household update" on journal_entries
  for update using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());
create policy "journal household delete" on journal_entries
  for delete using (household_id = public.get_my_household_id());

create policy "milestones household all" on milestones
  for all using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

create policy "kicks household all" on kick_sessions
  for all using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

create policy "contractions household all" on contraction_sessions
  for all using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table health_logs;
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table appointments;
