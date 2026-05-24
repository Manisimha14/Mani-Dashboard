create table if not exists public.google_fit_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_fit_tokens enable row level security;

drop policy if exists "No direct client access to google_fit_tokens" on public.google_fit_tokens;
create policy "No direct client access to google_fit_tokens"
on public.google_fit_tokens
for all
using (false)
with check (false);

create or replace function public.set_google_fit_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists google_fit_tokens_set_updated_at on public.google_fit_tokens;
create trigger google_fit_tokens_set_updated_at
before update on public.google_fit_tokens
for each row
execute function public.set_google_fit_tokens_updated_at();
