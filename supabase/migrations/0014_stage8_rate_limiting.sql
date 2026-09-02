-- Stage 8 (partial): rate limiting on every economy-mutating RPC. Most of
-- these already have a business-logic guard (fee cost, one-time-per-
-- opportunity, the 24h Hunt gate), but nothing stops a client from calling
-- the RPC directly, as fast as HTTP allows, within those guards -- e.g.
-- roaming Explorer Mode rescuing every stranded bottle it can find in a
-- burst. This adds a generic per-user/per-action cooldown as defense in
-- depth, independent of each function's own feature rules.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  occurred_at timestamptz not null default now ()
);

create index if not exists rate_limit_hits_lookup_idx on public.rate_limit_hits (user_id, action, occurred_at);

-- No RLS policies at all: this table exists only to be written and read by
-- SECURITY DEFINER functions (which bypass RLS via table ownership, same
-- as bottle_events). There's nothing here an ordinary client should ever
-- query or write directly.
alter table public.rate_limit_hits enable row level security;

-- Not granted to `authenticated` -- only callable from other SECURITY
-- DEFINER functions, which execute as the owning role and can call it
-- regardless. A client can't invoke this directly to probe or pollute it.
create or replace function public.check_rate_limit (p_action text, p_max_calls integer, p_window interval)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  select count (*) into v_count
  from public.rate_limit_hits
  where user_id = auth.uid ()
    and action = p_action
    and occurred_at > now () - p_window;

  if v_count >= p_max_calls then
    raise exception 'Too many attempts -- please wait before trying again';
  end if;

  insert into public.rate_limit_hits (user_id, action)
  values (auth.uid (), p_action);
end;
$$;

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
  perform public.check_rate_limit ('release_bottle', 10, interval '1 hour');

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

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), -1, 'BOTTLE_RELEASED');

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

create or replace function public.break_seal (p_bottle_id uuid)
returns table (message text, fees integer, destination_progress integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_message text;
begin
  perform public.check_rate_limit ('break_seal', 30, interval '1 hour');

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
  set fees = profiles.fees + 1, destination_progress = profiles.destination_progress + 1
  where id = auth.uid ();

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'BOTTLE_RECEIVED');

  return query
  select v_message, p.fees, p.destination_progress
  from public.profiles p
  where p.id = auth.uid ();
end;
$$;

grant execute on function public.break_seal (uuid) to authenticated;

-- rescue_bottle is the sharpest farming risk of the six: with thousands of
-- shore zones now in play, a user roaming Explorer Mode could otherwise
-- rescue many distinct stranded bottles in a single burst, each worth
-- +1 Fee, bounded only by how many happen to be stranded right now. This
-- cap is deliberately tighter than the others.
create or replace function public.rescue_bottle (p_bottle_id uuid)
returns table (fees integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_shore_id uuid;
begin
  perform public.check_rate_limit ('rescue_bottle', 5, interval '1 hour');

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

  update public.profiles set fees = profiles.fees + 1
  where id = auth.uid ();

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'BOTTLE_RESCUED');

  return query
  select p.fees from public.profiles p where p.id = auth.uid ();
end;
$$;

grant execute on function public.rescue_bottle (uuid) to authenticated;

create or replace function public.relocate_home_shore (p_new_shore_id uuid)
returns table (home_shore_id uuid, fees integer, relocations_used integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_progress integer;
  v_relocations_used integer;
  v_current_home uuid;
begin
  perform public.check_rate_limit ('relocate_home_shore', 5, interval '1 hour');

  select pr.destination_progress, pr.relocations_used, pr.home_shore_id
    into v_progress, v_relocations_used, v_current_home
  from public.profiles pr
  where pr.id = auth.uid ();

  if v_current_home is null then
    raise exception 'Choose a Home Shore first';
  end if;

  if p_new_shore_id = v_current_home then
    raise exception 'That is already your Home Shore';
  end if;

  if not exists (select 1 from public.shore_zones sz where sz.id = p_new_shore_id) then
    raise exception 'Unknown shore zone';
  end if;

  if v_relocations_used = 0 then
    if v_progress < 5 then
      raise exception 'Reach 5 Destination Progress to unlock your first free relocation';
    end if;

    update public.profiles pr
    set home_shore_id = p_new_shore_id,
        relocations_used = 1
    where pr.id = auth.uid ()
      and pr.relocations_used = 0;

    if not found then
      raise exception 'Free relocation already used';
    end if;

    insert into public.fee_transactions (user_id, amount, reason)
    values (auth.uid (), 0, 'RELOCATION_FREE');
  else
    update public.profiles pr
    set home_shore_id = p_new_shore_id,
        fees = pr.fees - 5,
        relocations_used = pr.relocations_used + 1
    where pr.id = auth.uid ()
      and pr.fees >= 5;

    if not found then
      raise exception 'Not enough Fees';
    end if;

    insert into public.fee_transactions (user_id, amount, reason)
    values (auth.uid (), -5, 'RELOCATION_PAID');
  end if;

  return query
  select pr.home_shore_id, pr.fees, pr.relocations_used
  from public.profiles pr
  where pr.id = auth.uid ();
end;
$$;

grant execute on function public.relocate_home_shore (uuid) to authenticated;

create or replace function public.claim_cleanup_discovery (p_opportunity_id uuid)
returns table (fees integer, current_coins integer)
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.check_rate_limit ('claim_cleanup_discovery', 10, interval '1 hour');

  if not exists (
    select 1 from public.cleanup_opportunities co
    where co.id = p_opportunity_id
      and (co.expires_at is null or co.expires_at > now ())
  ) then
    raise exception 'This opportunity is no longer available';
  end if;

  begin
    insert into public.cleanup_engagements (user_id, opportunity_id)
    values (auth.uid (), p_opportunity_id);
  exception
    when unique_violation then
      raise exception 'You already discovered this opportunity';
  end;

  update public.profiles pr
  set fees = pr.fees + 1,
      current_coins = pr.current_coins + 1
  where pr.id = auth.uid ();

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'CLEANUP_DISCOVERED');

  insert into public.current_coin_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'CLEANUP_DISCOVERED');

  return query
  select pr.fees, pr.current_coins from public.profiles pr where pr.id = auth.uid ();
end;
$$;

grant execute on function public.claim_cleanup_discovery (uuid) to authenticated;

create or replace function public.activate_current_boost ()
returns table (current_coins integer, boost_until timestamptz)
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.check_rate_limit ('activate_current_boost', 5, interval '1 hour');

  update public.profiles pr
  set current_coins = pr.current_coins - 1,
      current_boost_until = now () + interval '5 minutes'
  where pr.id = auth.uid ()
    and pr.current_coins >= 1;

  if not found then
    raise exception 'Not enough Current Coins';
  end if;

  insert into public.current_coin_transactions (user_id, amount, reason)
  values (auth.uid (), -1, 'CURRENT_BOOST_USED');

  return query
  select pr.current_coins, pr.current_boost_until
  from public.profiles pr
  where pr.id = auth.uid ();
end;
$$;

grant execute on function public.activate_current_boost () to authenticated;
