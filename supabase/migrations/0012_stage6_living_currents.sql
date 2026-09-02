-- Stage 6: Living Currents. Monthly Fast Current events double drift
-- movement without touching bottle age at all -- age is always computed
-- as now() - released_at elsewhere in the app, completely independent of
-- how simulate-tick advances position, so there's nothing extra to guard
-- there. This migration only needs to: (1) schedule the events, (2) let
-- simulate-tick look one up and scale movement by its multiplier, and
-- (3) give bottles a way to record having experienced one.

create table if not exists public.ocean_events (
  id uuid primary key default gen_random_uuid (),
  event_type text not null check (event_type in ('fast_current')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  multiplier numeric not null default 2,
  created_at timestamptz not null default now (),
  constraint ocean_events_valid_range check (ends_at > starts_at)
);

alter table public.ocean_events enable row level security;

create policy "Anyone signed in can view ocean events"
  on public.ocean_events for select
  using (auth.role () = 'authenticated');

create index if not exists ocean_events_active_idx on public.ocean_events (event_type, starts_at, ends_at);

-- Bottles can now also log having drifted through a Fast Current window.
-- A plain (non-partial) unique index on (bottle_id, ocean_event_id) is
-- enough to dedupe this: every other event_type always leaves
-- ocean_event_id null, and SQL never treats two nulls as duplicates, so
-- this constraint only ever "bites" for fast_current rows.
alter table public.bottle_events
  add column if not exists ocean_event_id uuid references public.ocean_events (id);

alter table public.bottle_events drop constraint if exists bottle_events_event_type_check;
alter table public.bottle_events add constraint bottle_events_event_type_check
  check (event_type in ('released', 'delivered', 'stranded', 'rescued', 'redrifted', 'read', 'fast_current'));

create unique index if not exists bottle_events_bottle_ocean_event_uidx
  on public.bottle_events (bottle_id, ocean_event_id);

-- Schedules one Fast Current event for the current calendar month if one
-- doesn't already exist -- random start day (within the first 26, so a
-- 4-day event can't run past month-end being weird about it) and random
-- 2-4 day duration. "Random/scheduled" per PLAN.md: the cadence is a
-- monthly cron job, the placement inside the month is random.
create or replace function public.schedule_fast_current ()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_month_start timestamptz := date_trunc('month', now ());
  v_start_offset_days int := floor(random () * 26)::int;
  v_duration_days int := 2 + floor(random () * 3)::int;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  if exists (
    select 1 from public.ocean_events
    where event_type = 'fast_current'
      and starts_at >= v_month_start
      and starts_at < v_month_start + interval '1 month'
  ) then
    return;
  end if;

  v_starts_at := v_month_start + (v_start_offset_days || ' days')::interval;
  v_ends_at := v_starts_at + (v_duration_days || ' days')::interval;

  insert into public.ocean_events (event_type, starts_at, ends_at, multiplier)
  values ('fast_current', v_starts_at, v_ends_at, 2);
end;
$$;

-- No secrets involved (unlike simulate-tick's schedule, this is a plain
-- SQL call, not an HTTP request), so it's safe to register directly here.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'schedule-fast-current-monthly',
  '0 0 1 * *',
  $$select public.schedule_fast_current ();$$
);

-- Run it once now too, so this month already has an event scheduled
-- instead of waiting for the 1st.
select public.schedule_fast_current ();
