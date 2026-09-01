-- Stage 4: Stranded Bottle Gameplay.
-- A stranded bottle sits at its landed shore until an explorer rescues it
-- (Re-drift). The Stranded Hunt itself only "becomes available" to a user
-- once they've gone 24 hours without receiving a bottle, per PLAN.md — this
-- doubles as the anti-farming rate limit on rescue rewards.

create table if not exists public.bottle_events (
  id bigint generated always as identity primary key,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  event_type text not null check (event_type in ('released', 'delivered', 'stranded', 'rescued', 'redrifted', 'read')),
  shore_id uuid references public.shore_zones (id),
  actor_id uuid references auth.users (id),
  occurred_at timestamptz not null default now()
);

alter table public.bottle_events enable row level security;

create policy "Sender or recipient can view their bottle's events"
  on public.bottle_events for select
  using (
    exists (
      select 1 from public.bottles
      where bottles.id = bottle_events.bottle_id
        and (bottles.sender_id = auth.uid () or bottles.recipient_id = auth.uid ())
    )
  );

create index if not exists bottle_events_bottle_id_idx on public.bottle_events (bottle_id, occurred_at);
create index if not exists bottle_events_delivered_idx on public.bottle_events (event_type, occurred_at);

-- Tracks the shore each drift *leg* started from, so a rescued bottle
-- doesn't immediately re-strand at the very shore it just left --
-- the same reason release excludes origin_shore_id from the shore-check.
alter table public.bottles
  add column if not exists drift_origin_shore_id uuid references public.shore_zones (id);

update public.bottles
set drift_origin_shore_id = origin_shore_id
where drift_origin_shore_id is null;

-- Backfill events for bottles that already exist, so the 24-hour Hunt gate
-- and the Passport history are correct immediately after this migration,
-- not just for transitions that happen from here on.
insert into public.bottle_events (bottle_id, event_type, shore_id, occurred_at)
select id, 'released', origin_shore_id, released_at
from public.bottles
where is_test = false;

insert into public.bottle_events (bottle_id, event_type, shore_id, actor_id, occurred_at)
select id, 'delivered', landed_shore_id, recipient_id, last_ticked_at
from public.bottles
where status in ('delivered', 'read') and recipient_id is not null;

insert into public.bottle_events (bottle_id, event_type, shore_id, occurred_at)
select id, 'stranded', landed_shore_id, last_ticked_at
from public.bottles
where status = 'stranded';

insert into public.bottle_events (bottle_id, event_type, actor_id, occurred_at)
select id, 'read', recipient_id, read_at
from public.bottles
where status = 'read' and read_at is not null;

-- release_bottle now also records drift_origin_shore_id (the current drift
-- leg's start) and a 'released' event.
create or replace function public.release_bottle (p_message text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_home_shore_id uuid;
  v_home_lat double precision;
  v_home_lng double precision;
  v_bottle_id uuid;
begin
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Message cannot be empty';
  end if;

  if length(p_message) > 1000 then
    raise exception 'Message is too long';
  end if;

  select home_shore_id into v_home_shore_id
  from public.profiles where id = auth.uid ();

  if v_home_shore_id is null then
    raise exception 'Choose a Home Shore before sending a bottle';
  end if;

  update public.profiles set fees = fees - 1
  where id = auth.uid () and fees >= 1;

  if not found then
    raise exception 'Not enough Fees';
  end if;

  select lat, lng into v_home_lat, v_home_lng
  from public.shore_zones where id = v_home_shore_id;

  insert into public.bottles (sender_id, origin_shore_id, drift_origin_shore_id, lat, lng, message, is_test)
  values (auth.uid (), v_home_shore_id, v_home_shore_id, v_home_lat, v_home_lng, p_message, false)
  returning id into v_bottle_id;

  insert into public.bottle_events (bottle_id, event_type, shore_id)
  values (v_bottle_id, 'released', v_home_shore_id);

  return v_bottle_id;
end;
$$;

grant execute on function public.release_bottle (text) to authenticated;

-- break_seal now also records a 'read' event.
create or replace function public.break_seal (p_bottle_id uuid)
returns table (message text, fees integer, destination_progress integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_message text;
begin
  update public.bottles
  set status = 'read', read_at = now ()
  where id = p_bottle_id
    and recipient_id = auth.uid ()
    and status = 'delivered'
  returning bottles.message into v_message;

  if not found then
    raise exception 'Bottle not available to open';
  end if;

  insert into public.bottle_events (bottle_id, event_type, actor_id)
  values (p_bottle_id, 'read', auth.uid ());

  update public.profiles
  set fees = fees + 1, destination_progress = destination_progress + 1
  where id = auth.uid ();

  return query
  select v_message, p.fees, p.destination_progress
  from public.profiles p
  where p.id = auth.uid ();
end;
$$;

grant execute on function public.break_seal (uuid) to authenticated;

-- Rescues (re-drifts) a stranded bottle. The hunter never sees the message,
-- never becomes the recipient, and gains no Destination Progress -- just
-- +1 Fee. Gated behind the same 24-hour-since-last-delivery rule that makes
-- the Hunt "available" in the first place, which also keeps one user from
-- farming rescue rewards back-to-back.
create or replace function public.rescue_bottle (p_bottle_id uuid)
returns table (fees integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_shore_id uuid;
begin
  if exists (
    select 1
    from public.bottle_events be
    join public.bottles b on b.id = be.bottle_id
    where be.event_type = 'delivered'
      and b.recipient_id = auth.uid ()
      and be.occurred_at > now () - interval '24 hours'
  ) then
    raise exception 'Stranded Hunt is not available yet';
  end if;

  update public.bottles
  set status = 'drifting',
      drift_origin_shore_id = landed_shore_id,
      last_ticked_at = now ()
  where id = p_bottle_id
    and status = 'stranded'
    and sender_id <> auth.uid ()
  returning landed_shore_id into v_shore_id;

  if not found then
    raise exception 'Bottle not available to rescue';
  end if;

  insert into public.bottle_events (bottle_id, event_type, shore_id, actor_id)
  values
    (p_bottle_id, 'rescued', v_shore_id, auth.uid ()),
    (p_bottle_id, 'redrifted', v_shore_id, auth.uid ());

  update public.profiles set fees = fees + 1
  where id = auth.uid ();

  return query
  select p.fees from public.profiles p where p.id = auth.uid ();
end;
$$;

grant execute on function public.rescue_bottle (uuid) to authenticated;
