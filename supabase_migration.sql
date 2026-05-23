-- Blueberry — Full Database Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run on a fresh project with no existing schema.

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- HOUSEHOLDS
-- ─────────────────────────────────────────────
create table if not exists households (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique not null,
  due_date     date,
  stage        text not null default 'pregnant' check (stage in ('ttc','pregnant','postpartum')),
  baby_name    text,
  baby_gender  text check (baby_gender in ('male','female','unknown')),
  baby_dob     date,
  created_at   timestamptz not null default now()
);

alter table households enable row level security;

-- ─────────────────────────────────────────────
-- USERS  (mirrors auth.users)
-- ─────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,
  role          text not null check (role in ('mother','partner')),
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

alter table users enable row level security;

-- ─────────────────────────────────────────────
-- HELPER — get the calling user's household_id
-- ─────────────────────────────────────────────
create or replace function get_my_household_id()
returns uuid language sql stable security definer as $$
  select household_id from users where id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────
-- HEALTH LOGS
-- ─────────────────────────────────────────────
create table if not exists health_logs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  logged_at     timestamptz not null default now(),
  symptoms      text[],
  mood          text,
  energy_level  int check (energy_level between 1 and 5),
  notes         text,
  weight_kg     numeric(5,2)
);

alter table health_logs enable row level security;

-- ─────────────────────────────────────────────
-- TODOS
-- ─────────────────────────────────────────────
create table if not exists todos (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  created_by    uuid not null references users(id) on delete cascade,
  title         text not null,
  is_done       boolean not null default false,
  due_date      date,
  priority      text not null default 'medium' check (priority in ('low','medium','high')),
  source        text not null default 'manual' check (source in ('manual','ai')),
  created_at    timestamptz not null default now()
);

alter table todos enable row level security;

-- ─────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────
create table if not exists appointments (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  title             text not null,
  appointment_date  timestamptz not null,
  location          text,
  notes             text,
  google_event_id   text,
  created_at        timestamptz not null default now()
);

alter table appointments enable row level security;

-- ─────────────────────────────────────────────
-- JOURNAL ENTRIES
-- ─────────────────────────────────────────────
create table if not exists journal_entries (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  author_id      uuid not null references users(id) on delete cascade,
  week_number    int,
  content        text not null,
  milestone_tag  text,
  media_urls     text[],
  created_at     timestamptz not null default now()
);

alter table journal_entries enable row level security;

-- ─────────────────────────────────────────────
-- KICK SESSIONS
-- ─────────────────────────────────────────────
create table if not exists kick_sessions (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  kick_count     int not null default 0,
  duration_secs  int,
  notes          text
);

alter table kick_sessions enable row level security;

-- ─────────────────────────────────────────────
-- CONTRACTION SESSIONS
-- ─────────────────────────────────────────────
create table if not exists contraction_sessions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  started_at    timestamptz not null default now(),
  contractions  jsonb not null default '[]',
  notes         text
);

alter table contraction_sessions enable row level security;

-- ─────────────────────────────────────────────
-- POSTPARTUM TABLES (Phase 2 — schema ready now)
-- ─────────────────────────────────────────────
create table if not exists feeding_logs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  logged_at     timestamptz not null default now(),
  type          text check (type in ('breast','bottle','solid')),
  duration_mins int,
  amount_ml     numeric(6,1),
  notes         text
);

alter table feeding_logs enable row level security;

create table if not exists sleep_logs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  notes         text
);

alter table sleep_logs enable row level security;

create table if not exists diaper_logs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  logged_at     timestamptz not null default now(),
  type          text check (type in ('wet','dirty','both','dry')),
  notes         text
);

alter table diaper_logs enable row level security;

create table if not exists pediatrician_visits (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  visit_date    date not null,
  weight_kg     numeric(5,3),
  height_cm     numeric(5,1),
  notes         text,
  created_at    timestamptz not null default now()
);

alter table pediatrician_visits enable row level security;

create table if not exists baby_milestones (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  milestone     text not null,
  achieved_at   date not null,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table baby_milestones enable row level security;

-- ─────────────────────────────────────────────
-- RLS POLICIES
-- All policies: household members can read/write their own household's data.
-- ─────────────────────────────────────────────

-- households: members can read their own household; anyone can insert (join/create flow)
create policy "household members can read" on households
  for select using (id = get_my_household_id());

create policy "authenticated users can create household" on households
  for insert with check (auth.uid() is not null);

create policy "household members can update" on households
  for update using (id = get_my_household_id());

-- users: read own household; insert own row; update own row
create policy "household members can read users" on users
  for select using (household_id = get_my_household_id());

create policy "user can insert own row" on users
  for insert with check (id = auth.uid());

create policy "user can update own row" on users
  for update using (id = auth.uid());

-- macro for all data tables
create policy "household read" on health_logs
  for select using (household_id = get_my_household_id());
create policy "household insert" on health_logs
  for insert with check (household_id = get_my_household_id());
create policy "household update" on health_logs
  for update using (household_id = get_my_household_id());
create policy "household delete" on health_logs
  for delete using (household_id = get_my_household_id());

create policy "household read" on todos
  for select using (household_id = get_my_household_id());
create policy "household insert" on todos
  for insert with check (household_id = get_my_household_id());
create policy "household update" on todos
  for update using (household_id = get_my_household_id());
create policy "household delete" on todos
  for delete using (household_id = get_my_household_id());

create policy "household read" on appointments
  for select using (household_id = get_my_household_id());
create policy "household insert" on appointments
  for insert with check (household_id = get_my_household_id());
create policy "household update" on appointments
  for update using (household_id = get_my_household_id());
create policy "household delete" on appointments
  for delete using (household_id = get_my_household_id());

create policy "household read" on journal_entries
  for select using (household_id = get_my_household_id());
create policy "household insert" on journal_entries
  for insert with check (household_id = get_my_household_id());
create policy "household update" on journal_entries
  for update using (household_id = get_my_household_id());
create policy "household delete" on journal_entries
  for delete using (household_id = get_my_household_id());

create policy "household read" on kick_sessions
  for select using (household_id = get_my_household_id());
create policy "household insert" on kick_sessions
  for insert with check (household_id = get_my_household_id());
create policy "household update" on kick_sessions
  for update using (household_id = get_my_household_id());
create policy "household delete" on kick_sessions
  for delete using (household_id = get_my_household_id());

create policy "household read" on contraction_sessions
  for select using (household_id = get_my_household_id());
create policy "household insert" on contraction_sessions
  for insert with check (household_id = get_my_household_id());
create policy "household update" on contraction_sessions
  for update using (household_id = get_my_household_id());
create policy "household delete" on contraction_sessions
  for delete using (household_id = get_my_household_id());

create policy "household read" on feeding_logs
  for select using (household_id = get_my_household_id());
create policy "household insert" on feeding_logs
  for insert with check (household_id = get_my_household_id());
create policy "household delete" on feeding_logs
  for delete using (household_id = get_my_household_id());

create policy "household read" on sleep_logs
  for select using (household_id = get_my_household_id());
create policy "household insert" on sleep_logs
  for insert with check (household_id = get_my_household_id());
create policy "household delete" on sleep_logs
  for delete using (household_id = get_my_household_id());

create policy "household read" on diaper_logs
  for select using (household_id = get_my_household_id());
create policy "household insert" on diaper_logs
  for insert with check (household_id = get_my_household_id());
create policy "household delete" on diaper_logs
  for delete using (household_id = get_my_household_id());

create policy "household read" on pediatrician_visits
  for select using (household_id = get_my_household_id());
create policy "household insert" on pediatrician_visits
  for insert with check (household_id = get_my_household_id());
create policy "household delete" on pediatrician_visits
  for delete using (household_id = get_my_household_id());

create policy "household read" on baby_milestones
  for select using (household_id = get_my_household_id());
create policy "household insert" on baby_milestones
  for insert with check (household_id = get_my_household_id());
create policy "household delete" on baby_milestones
  for delete using (household_id = get_my_household_id());

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table health_logs;
alter publication supabase_realtime add table kick_sessions;
alter publication supabase_realtime add table contraction_sessions;

-- ─────────────────────────────────────────────
-- INDEXES  (household_id lookups are the hot path)
-- ─────────────────────────────────────────────
create index if not exists idx_users_household          on users(household_id);
create index if not exists idx_health_logs_household    on health_logs(household_id);
create index if not exists idx_health_logs_logged_at    on health_logs(household_id, logged_at desc);
create index if not exists idx_todos_household          on todos(household_id);
create index if not exists idx_appointments_household   on appointments(household_id);
create index if not exists idx_appointments_date        on appointments(household_id, appointment_date);
create index if not exists idx_kick_sessions_household  on kick_sessions(household_id);
create index if not exists idx_contractions_household   on contraction_sessions(household_id);
create index if not exists idx_journal_household        on journal_entries(household_id);
