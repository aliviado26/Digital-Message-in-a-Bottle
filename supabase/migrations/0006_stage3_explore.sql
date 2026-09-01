-- Stage 3: Explorer Mode needs to see OTHER users' drifting/stranded
-- bottles, but the Seal Rule must hold even against someone querying the
-- API directly, not just the UI. These views expose only safe columns
-- (no message, no sender_id, no recipient_id) and are owned by the
-- migration role (not security_invoker), so they read past bottles' RLS
-- for exactly this narrow, already-sanitized shape.
create view public.explorable_bottles as
select
  id,
  status,
  lat,
  lng,
  distance_km,
  released_at,
  origin_shore_id,
  landed_shore_id
from public.bottles
where status in ('drifting', 'stranded');

grant select on public.explorable_bottles to authenticated;

create view public.explorable_bottle_positions as
select bottle_id, lat, lng, recorded_at
from public.bottle_positions;

grant select on public.explorable_bottle_positions to authenticated;
