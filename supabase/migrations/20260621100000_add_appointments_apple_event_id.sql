alter table if exists public.appointments
  add column if not exists apple_event_id text;

create index if not exists idx_appointments_apple_event_id
  on public.appointments(apple_event_id);
