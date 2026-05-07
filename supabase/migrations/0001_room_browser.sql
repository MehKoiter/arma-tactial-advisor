-- Room browser support: friendly names, public listing, and a safe view that
-- excludes the PIN. Existing rooms remain private (is_public = false) until
-- their owner opts in.

-- 1. Columns
alter table public.rooms
  add column if not exists name text;

alter table public.rooms
  add column if not exists is_public boolean not null default false;

alter table public.rooms
  add column if not exists created_at timestamptz not null default now();

-- 2. Index for "recent public rooms" queries
create index if not exists rooms_public_active_idx
  on public.rooms (is_public, last_active_at desc)
  where is_public = true;

-- 3. PIN-safe public projection
drop view if exists public.public_rooms;

create view public.public_rooms as
select
  slug,
  name,
  (pin is not null) as has_pin,
  battlemetrics_us_id,
  battlemetrics_rus_id,
  last_active_at,
  created_at
from public.rooms
where is_public = true;

grant select on public.public_rooms to anon, authenticated;

-- 4. RLS policy for browsing public rooms.
-- Only run this block if RLS is enabled on public.rooms.
drop policy if exists rooms_public_browse on public.rooms;

create policy rooms_public_browse on public.rooms
  for select
  using (is_public = true);
