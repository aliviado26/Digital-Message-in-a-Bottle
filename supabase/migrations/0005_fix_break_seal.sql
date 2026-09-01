-- break_seal()'s RETURNS TABLE columns (message, fees, destination_progress)
-- implicitly declare same-named local variables, which made the reward
-- UPDATE's "fees + 1" / "destination_progress + 1" ambiguous against the
-- profiles columns of the same name. Qualify them with the table name.
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

  update public.profiles
  set fees = profiles.fees + 1, destination_progress = profiles.destination_progress + 1
  where id = auth.uid ();

  return query
  select v_message, p.fees, p.destination_progress
  from public.profiles p
  where p.id = auth.uid ();
end;
$$;
