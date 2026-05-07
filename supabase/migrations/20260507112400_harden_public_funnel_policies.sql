-- Harden public access to funnel-related tables.
-- Goal: allow public reads only for published funnels, and restrict anonymous writes
-- (events/leads) to published funnels.

-- Funnels: replace broad public read policy with "published only".
drop policy if exists "Anyone can view funnels by ID" on public.funnels;

create policy "Public can view published funnels by ID"
on public.funnels
for select
to anon
using (
  saved_at is not null
  and saved_at <> updated_at
);

-- Leads: only allow anonymous inserts for published funnels.
drop policy if exists "Anyone can create leads" on public.leads;

create policy "Anyone can create leads for published funnels"
on public.leads
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.funnels f
    where f.id = funnel_id
      and f.saved_at is not null
      and f.saved_at <> f.updated_at
  )
);

-- Events: only allow anonymous inserts for published funnels.
drop policy if exists "Anyone can create events" on public.events;

create policy "Anyone can create events for published funnels"
on public.events
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.funnels f
    where f.id = funnel_id
      and f.saved_at is not null
      and f.saved_at <> f.updated_at
  )
);

