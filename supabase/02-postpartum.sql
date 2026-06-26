-- Additive postpartum support only.
-- This file creates household-scoped event storage for shared Family Mode handoffs.

create table if not exists public.household_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.household_events enable row level security;

drop policy if exists "household all" on public.household_events;
create policy "household all" on public.household_events
  for all using (household_id = public.get_my_household_id())
       with check (household_id = public.get_my_household_id());

create index if not exists idx_household_events_household_created_at
  on public.household_events(household_id, created_at desc);

create index if not exists idx_household_events_household_type
  on public.household_events(household_id, event_type, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'household_events'
  ) then
    alter publication supabase_realtime add table public.household_events;
  end if;
end
$$;
