-- ╭─────────────────────────────────────────────────────────────────────────╮
-- │ Blueberry — consolidated schema                                          │
-- │                                                                          │
-- │ Single source of truth for the Supabase Postgres schema.                 │
-- │ Replaces the previous supabase-schema.sql + supabase_migration.sql pair, │
-- │ which had drifted from each other and from types/index.ts.               │
-- │                                                                          │
-- │ Idempotent: drops the prior Blueberry scaffolding and recreates clean.   │
-- │ DESTRUCTIVE: any test data in Blueberry tables is dropped on re-run.     │
-- │                                                                          │
-- │ Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query).    │
-- ╰─────────────────────────────────────────────────────────────────────────╯


-- ╭─── extensions ──────────────────────────────────────────────────────────╮
create extension if not exists "pgcrypto";


-- ╭─── drop prior scaffolding ──────────────────────────────────────────────╮
-- Cascade through policies, FKs, indexes, and realtime publication membership.
-- Drop in reverse dependency order so FKs unwind cleanly.

drop table if exists contraction_sessions cascade;
drop table if exists kick_sessions         cascade;
drop table if exists baby_logs             cascade;

-- Postpartum tables from a prior migration — forward-looking, no current
-- consumers. They'll come back in a 02-postpartum.sql when Phase 7+ needs them.
drop table if exists baby_milestones       cascade;
drop table if exists pediatrician_visits   cascade;
drop table if exists diaper_logs           cascade;
drop table if exists sleep_logs            cascade;
drop table if exists feeding_logs          cascade;

-- Orphaned: code uses journal_entries.milestone_tag, not a separate table.
drop table if exists milestones            cascade;

drop table if exists journal_entries       cascade;
drop table if exists todos                 cascade;
drop table if exists appointments          cascade;
drop table if exists health_logs           cascade;
drop table if exists device_push_tokens    cascade;
drop table if exists notification_preferences cascade;
drop table if exists users                 cascade;
drop table if exists households            cascade;

drop function if exists public.get_my_household_id()         cascade;
drop function if exists public.household_member_count(uuid)  cascade;
drop function if exists public.join_household_by_code(text)  cascade;
drop function if exists public.set_updated_at()              cascade;


-- ╭─── tables ──────────────────────────────────────────────────────────────╮
create table households (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique not null,
  due_date     date,
  stage        text not null default 'pregnant' check (stage in ('ttc','pregnant','postpartum')),
  baby_name    text,
  baby_gender  text check (baby_gender in ('male','female','unknown')),
  baby_dob     date,
  created_at   timestamptz not null default now()
);

create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references households(id) on delete cascade,
  role          text not null check (role in ('mother','partner')),
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  -- One mother + one partner per household. Enforces the 2-user cap structurally
  -- in addition to the RLS member-count check on insert.
  unique (household_id, role)
);

create table device_push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  platform     text not null check (platform in ('ios')),
  token        text not null,
  environment  text not null check (environment in ('sandbox', 'production')),
  bundle_id    text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (platform, token)
);

create table notification_preferences (
  user_id               uuid primary key references users(id) on delete cascade,
  appointment_reminders boolean not null default true,
  partner_check_ins     boolean not null default true,
  new_todos             boolean not null default true,
  kick_reminder         boolean not null default false,
  quiet_hours_enabled   boolean not null default true,
  quiet_from            time not null default '21:00:00',
  quiet_until           time not null default '07:00:00',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table health_logs (
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

create table appointments (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  title             text not null,
  appointment_date  timestamptz not null,
  location          text,
  notes             text,
  google_event_id   text,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table todos (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  created_by    uuid references users(id) on delete set null,
  title         text not null,
  is_done       boolean not null default false,
  due_date      date,
  priority      text not null default 'medium' check (priority in ('low','medium','high')),
  source        text not null default 'manual' check (source in ('manual','ai')),
  created_at    timestamptz not null default now()
);

create table journal_entries (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  author_id      uuid references users(id) on delete set null,
  week_number    int,
  content        text not null,
  milestone_tag  text,
  media_urls     text[],
  created_at     timestamptz not null default now()
);

create table baby_logs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  log_type      text not null check (log_type in ('feeding','sleep','diaper','handoff')),
  logged_at     timestamptz not null default now(),
  details       jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create table kick_sessions (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  started_at     timestamptz not null,
  ended_at       timestamptz,
  kick_count     int not null default 0,
  duration_secs  int,
  notes          text
);

create table contraction_sessions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  contractions  jsonb not null default '[]'::jsonb,
  notes         text
);


-- ╭─── helper functions ────────────────────────────────────────────────────╮

-- Returns the household_id of the calling user. Returns null if the user has
-- no row yet (e.g. mid-signup, before household creation/join).
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

-- Partner join flow.
--
-- The "household_members read" RLS policy keys on get_my_household_id(), which
-- returns null for a user with no users row yet — so a Partner can't SELECT a
-- household by invite_code during signup. This RPC bypasses RLS via security
-- definer to look up the household_id, enforce the 2-user cap, and return the
-- uuid. The client then inserts the users row (which RLS allows under its own
-- 2-user cap policy).
create or replace function public.join_household_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hh_id        uuid;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id into hh_id
    from public.households
   where invite_code = upper(code)
   limit 1;

  if hh_id is null then
    raise exception 'invalid_invite_code';
  end if;

  select count(*)::integer into member_count
    from public.users
   where household_id = hh_id;

  if member_count >= 2 then
    raise exception 'household_full';
  end if;

  return hh_id;
end;
$$;

grant execute on function public.join_household_by_code(text) to authenticated;

-- Household creation.
--
-- The "household members read" SELECT policy keys on get_my_household_id(),
-- which returns null until the creator has a users row. A direct
-- `insert ... returning *` therefore fails the SELECT policy on the brand-new
-- row (the row is invisible because the creator isn't a member yet). This RPC
-- bypasses that chicken-and-egg via security definer: it creates the household
-- and the creator's users row atomically in one transaction, then returns the
-- household. Mirrors join_household_by_code on the partner side.
create or replace function public.create_household(p_role text, p_invite_code text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hh  households;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_role not in ('mother','partner') then
    raise exception 'invalid_role';
  end if;
  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'already_in_household';
  end if;

  insert into public.households (invite_code, stage)
  values (upper(p_invite_code), 'pregnant')
  returning * into v_hh;

  insert into public.users (id, household_id, role)
  values (v_uid, v_hh.id, p_role);

  return v_hh;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;


-- ╭─── row level security ──────────────────────────────────────────────────╮
alter table households           enable row level security;
alter table users                enable row level security;
alter table device_push_tokens   enable row level security;
alter table notification_preferences enable row level security;
alter table health_logs          enable row level security;
alter table appointments         enable row level security;
alter table todos                enable row level security;
alter table journal_entries      enable row level security;
alter table baby_logs            enable row level security;
alter table kick_sessions        enable row level security;
alter table contraction_sessions enable row level security;

-- households
create policy "household members read"   on households
  for select using (id = public.get_my_household_id());
create policy "signed-in user creates"   on households
  for insert with check (auth.uid() is not null);
create policy "household members update" on households
  for update using (id = public.get_my_household_id())
   with check (id = public.get_my_household_id());

-- users — own-household read; own-row insert under 2-user cap; own-row update
create policy "household members read users" on users
  for select using (household_id = public.get_my_household_id());
create policy "user inserts own row under two member cap" on users
  for insert with check (
    id = auth.uid()
    and public.household_member_count(household_id) < 2
  );
create policy "user updates own row" on users
  for update using (id = auth.uid())
   with check (id = auth.uid());

create policy "push token read" on device_push_tokens
  for select using (user_id = auth.uid());
create policy "push token insert" on device_push_tokens
  for insert with check (user_id = auth.uid());
create policy "push token update" on device_push_tokens
  for update using (user_id = auth.uid())
   with check (user_id = auth.uid());
create policy "push token delete" on device_push_tokens
  for delete using (user_id = auth.uid());

create policy "notification preferences read" on notification_preferences
  for select using (user_id = auth.uid());
create policy "notification preferences insert" on notification_preferences
  for insert with check (user_id = auth.uid());
create policy "notification preferences update" on notification_preferences
  for update using (user_id = auth.uid())
   with check (user_id = auth.uid());
create policy "notification preferences delete" on notification_preferences
  for delete using (user_id = auth.uid());

-- Data tables — household-scoped CRUD
create policy "household select" on health_logs for select using (household_id = public.get_my_household_id());
create policy "household insert" on health_logs for insert with check (household_id = public.get_my_household_id());
create policy "household update" on health_logs for update using (household_id = public.get_my_household_id()) with check (household_id = public.get_my_household_id());
create policy "household delete" on health_logs for delete using (household_id = public.get_my_household_id());

create policy "household select" on appointments for select using (household_id = public.get_my_household_id());
create policy "household insert" on appointments for insert with check (household_id = public.get_my_household_id());
create policy "household update" on appointments for update using (household_id = public.get_my_household_id()) with check (household_id = public.get_my_household_id());
create policy "household delete" on appointments for delete using (household_id = public.get_my_household_id());

create policy "household select" on todos for select using (household_id = public.get_my_household_id());
create policy "household insert" on todos for insert with check (household_id = public.get_my_household_id());
create policy "household update" on todos for update using (household_id = public.get_my_household_id()) with check (household_id = public.get_my_household_id());
create policy "household delete" on todos for delete using (household_id = public.get_my_household_id());

create policy "household select" on journal_entries for select using (household_id = public.get_my_household_id());
create policy "household insert" on journal_entries for insert with check (household_id = public.get_my_household_id());
create policy "household update" on journal_entries for update using (household_id = public.get_my_household_id()) with check (household_id = public.get_my_household_id());
create policy "household delete" on journal_entries for delete using (household_id = public.get_my_household_id());

create policy "household all" on baby_logs
  for all using (household_id = public.get_my_household_id())
       with check (household_id = public.get_my_household_id());

create policy "household all" on kick_sessions
  for all using (household_id = public.get_my_household_id())
       with check (household_id = public.get_my_household_id());

create policy "household all" on contraction_sessions
  for all using (household_id = public.get_my_household_id())
       with check (household_id = public.get_my_household_id());


-- ╭─── realtime ────────────────────────────────────────────────────────────╮
-- Only the four collaborative tables. Kick / contraction sessions are
-- single-user logging tools and don't broadcast.
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table health_logs;
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table baby_logs;


-- ╭─── indexes ─────────────────────────────────────────────────────────────╮
-- household_id is the hot path on every query.
create index idx_users_household          on users(household_id);
create index idx_health_logs_household    on health_logs(household_id);
create index idx_health_logs_logged_at    on health_logs(household_id, logged_at desc);
create index idx_appointments_household   on appointments(household_id);
create index idx_appointments_date        on appointments(household_id, appointment_date);
create index idx_todos_household          on todos(household_id);
create index idx_todos_due_date           on todos(household_id, due_date) where due_date is not null;
create index idx_journal_household        on journal_entries(household_id);
create index idx_baby_logs_household      on baby_logs(household_id, logged_at desc);
create index idx_kick_sessions_household  on kick_sessions(household_id);
create index idx_contractions_household   on contraction_sessions(household_id);


-- ╭─── push-token helpers ────────────────────────────────────────────────╮
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_device_push_tokens_updated_at on device_push_tokens;
drop trigger if exists set_notification_preferences_updated_at on notification_preferences;

create trigger set_device_push_tokens_updated_at
  before update on device_push_tokens
  for each row
  execute function public.set_updated_at();

create trigger set_notification_preferences_updated_at
  before update on notification_preferences
  for each row
  execute function public.set_updated_at();
