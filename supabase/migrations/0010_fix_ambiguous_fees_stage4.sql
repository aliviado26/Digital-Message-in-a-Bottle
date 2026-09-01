-- 0009 re-created break_seal() and introduced rescue_bottle(), both of
-- which declare RETURNS TABLE columns named "fees" (and, for break_seal,
-- "destination_progress"). Those implicitly declare same-named local
-- variables, which makes an unqualified "fees + 1" ambiguous against the
-- profiles column of the same name -- the exact bug 0005 already fixed
-- once for break_seal, and which 0009 accidentally reintroduced by
-- rewriting that function from the pre-0005 body. Qualify with the table
-- name in both functions, same fix as 0005.

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

  return query
  select v_message, p.fees, p.destination_progress
  from public.profiles p
  where p.id = auth.uid ();
end;
$$;

grant execute on function public.break_seal (uuid) to authenticated;

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

  return query
  select p.fees from public.profiles p where p.id = auth.uid ();
end;
$$;

grant execute on function public.rescue_bottle (uuid) to authenticated;
