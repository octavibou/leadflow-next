-- Store sensitive per-funnel secrets server-side (not readable by clients)

create table if not exists public.funnel_secrets (
  funnel_id uuid primary key references public.funnels (id) on delete cascade,
  meta_access_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_funnel_secrets_updated_at on public.funnel_secrets;
create trigger set_funnel_secrets_updated_at
before update on public.funnel_secrets
for each row
execute function public.set_updated_at();

alter table public.funnel_secrets enable row level security;

-- IMPORTANT: Do not allow SELECT from client roles (prevents token leakage).
-- Allow authenticated users to INSERT/UPDATE secrets only for funnels they own.
create policy "funnel_secrets_insert_own"
on public.funnel_secrets
for insert
to authenticated
with check (
  exists (
    select 1 from public.funnels f
    where f.id = funnel_id
      and f.user_id = auth.uid()
  )
);

create policy "funnel_secrets_update_own"
on public.funnel_secrets
for update
to authenticated
using (
  exists (
    select 1 from public.funnels f
    where f.id = funnel_id
      and f.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.funnels f
    where f.id = funnel_id
      and f.user_id = auth.uid()
  )
);

