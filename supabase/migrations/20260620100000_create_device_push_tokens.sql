create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('ios')),
  token text not null,
  environment text not null check (environment in ('sandbox', 'production')),
  bundle_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, token)
);

alter table public.device_push_tokens enable row level security;

create policy "Users can read their own push tokens"
  on public.device_push_tokens
  for select
  using (auth.uid() = user_id);

create policy "Users can register their own push tokens"
  on public.device_push_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push tokens"
  on public.device_push_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on public.device_push_tokens
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_device_push_tokens_updated_at on public.device_push_tokens;

create trigger set_device_push_tokens_updated_at
  before update on public.device_push_tokens
  for each row
  execute function public.set_updated_at();
