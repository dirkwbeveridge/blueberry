do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'baby_logs'
      and c.conname = 'baby_logs_log_type_check'
  ) then
    alter table public.baby_logs drop constraint baby_logs_log_type_check;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'baby_logs'
      and c.conname = 'baby_logs_log_type_check'
  ) then
    alter table public.baby_logs
      add constraint baby_logs_log_type_check
      check (log_type in ('feeding', 'sleep', 'diaper', 'handoff', 'pumping', 'solids'));
  end if;
end
$$;
