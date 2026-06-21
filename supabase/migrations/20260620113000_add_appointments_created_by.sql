alter table if exists public.appointments
  add column if not exists created_by uuid references public.users(id) on delete set null;

create index if not exists idx_appointments_created_by
  on public.appointments(created_by);
