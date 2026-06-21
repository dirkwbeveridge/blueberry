create table if not exists public.baby_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  log_type text not null check (log_type in ('feeding', 'sleep', 'diaper', 'handoff')),
  logged_at timestamptz not null default now(),
  details jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.baby_logs enable row level security;

drop policy if exists "household all" on public.baby_logs;
create policy "household all" on public.baby_logs
  for all using (household_id = public.get_my_household_id())
       with check (household_id = public.get_my_household_id());

create index if not exists idx_baby_logs_household
  on public.baby_logs(household_id, logged_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'baby_logs'
  ) then
    alter publication supabase_realtime add table public.baby_logs;
  end if;
end
$$;
