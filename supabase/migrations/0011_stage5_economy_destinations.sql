-- Stage 5: Economy & Destinations. A proper Fee transaction ledger (not
-- just a running "fees" integer), plus relocation -- the first one free
-- once Destination Progress reaches 5 (the "Destination Pass"), every
-- one after that costing 5 Fees. Relocation is deliberately a *different*
-- path from set_home_shore(), which only ever fires once per account.

create table if not exists public.fee_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in (
    'ACCOUNT_CREATED', 'BOTTLE_RELEASED', 'BOTTLE_RECEIVED',
    'BOTTLE_RESCUED', 'RELOCATION_FREE', 'RELOCATION_PAID'
  )),
  created_at timestamptz not null default now()
);

alter table public.fee_transactions enable row level security;

create policy "Users can view their own fee transactions"
  on public.fee_transactions for select
  using (auth.uid () = user_id);

create index if not exists fee_transactions_user_id_idx on public.fee_transactions (user_id, created_at);

alter table public.profiles
  add column if not exists relocations_used integer not null default 0;

-- Backfill so the ledger actually reconciles with existing profiles.fees
-- balances, not just transactions from this point forward.
insert into public.fee_transactions (user_id, amount, reason, created_at)
select id, 5, 'ACCOUNT_CREATED', created_at
from public.profiles;

insert into public.fee_transactions (user_id, amount, reason, created_at)
select sender_id, -1, 'BOTTLE_RELEASED', released_at
from public.bottles
where is_test = false;

insert into public.fee_transactions (user_id, amount, reason, created_at)
select actor_id, 1, 'BOTTLE_RECEIVED', occurred_at
from public.bottle_events
where event_type = 'read' and actor_id is not null;

insert into public.fee_transactions (user_id, amount, reason, created_at)
select actor_id, 1, 'BOTTLE_RESCUED', occurred_at
from public.bottle_events
where event_type = 'rescued' and actor_id is not null;

-- Account creation now also logs its starting grant.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.fee_transactions (user_id, amount, reason)
  values (new.id, 5, 'ACCOUNT_CREATED');

  return new;
end;
$$;

-- release_bottle now also logs the spend. RETURNS uuid (no same-named
-- OUT columns), so no ambiguity risk here.
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

-- break_seal now also logs the reward. Kept fully alias-qualified
-- (profiles.fees / profiles.destination_progress) per the fix in 0005/0010,
-- since RETURNS TABLE(fees, destination_progress, ...) shadows those names.
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

-- rescue_bottle now also logs the reward. Same alias-qualification rule.
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

  update public.profiles set fees = profiles.fees + 1
  where id = auth.uid ();

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'BOTTLE_RESCUED');

  return query
  select p.fees from public.profiles p where p.id = auth.uid ();
end;
$$;

grant execute on function public.rescue_bottle (uuid) to authenticated;

-- Relocates an already-set Home Shore. The first call per account is free
-- (gated behind 5 Destination Progress -- the "Destination Pass"); every
-- call after that costs 5 Fees. Every table reference below is alias-
-- qualified (pr./sz.) since RETURNS TABLE(home_shore_id, fees,
-- relocations_used) shadows those exact column names -- the same
-- ambiguity class fixed for break_seal/rescue_bottle, avoided here from
-- the start instead of hitting it in production.
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
